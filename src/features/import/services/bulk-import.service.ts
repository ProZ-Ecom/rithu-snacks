import crypto from "crypto";
import * as XLSX from "xlsx";
import { db } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportRowResult {
  row: number;
  sheet: string;
  status: "success" | "rejected";
  name: string;
  reason?: string;
  data?: Record<string, unknown>;
}

export interface ImportPreviewItem {
  categoryName: string;
  productName: string;
  sku: string;
  variants: {
    variantName: string;
    unit: string;
    unitValue: number;
    variantSku: string;
    price: number;
    stockQty: number;
    isDefault: boolean;
  }[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  rejectedCount: number;
  preview: ImportPreviewItem[];
  rejected: ImportRowResult[];
  importedCategories: string[];
  importedProducts: string[];
}

// ─── Raw Excel Row Types ─────────────────────────────────────────────────────

interface RawCategoryRow {
  category_name?: string;
  parent_category?: string;
  description?: string;
  sort_order?: number | string;
}

interface RawProductRow {
  category_name?: string;
  product_name?: string;
  sku?: string;
  base_price?: number | string;
  sale_price?: number | string;
  description?: string;
  brand?: string;
  hsn_code?: string;
}

interface RawVariantRow {
  product_sku?: string;
  variant_name?: string;
  unit?: string;
  unit_value?: number | string;
  variant_sku?: string;
  price?: number | string;
  stock_qty?: number | string;
  reorder_level?: number | string;
  is_default?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return v != null ? String(v).trim() : "";
}

function safeNum(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v ?? fallback));
  return isNaN(n) ? fallback : n;
}

function safeBool(v: unknown): boolean {
  const s = safeStr(v).toUpperCase();
  return s === "YES" || s === "TRUE" || s === "1";
}

function makeUniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base).slice(0, 160);
  if (!slug) slug = "item";
  let attempt = slug;
  let i = 2;
  while (existing.has(attempt)) {
    attempt = `${slug}-${i++}`;
  }
  existing.add(attempt);
  return attempt;
}

// ─── Parse Excel ─────────────────────────────────────────────────────────────

interface RawUnifiedRow {
  category?: string;
  category_name?: string;
  product_name?: string;
  product_sku?: string;
  product_description?: string;
  description?: string;
  brand?: string;
  hsn_code?: string;
  variant_name?: string;
  unit?: string;
  unit_value?: number | string;
  variant_sku?: string;
  sku?: string;
  price?: number | string;
  base_price?: number | string;
  sale_price?: number | string;
  stock_qty?: number | string;
  stock?: number | string;
  reorder_level?: number | string;
  is_default?: string;
}

function parseExcelBuffer(buffer: Buffer): {
  categories: RawCategoryRow[];
  products: RawProductRow[];
  variants: RawVariantRow[];
  isUnified: boolean;
  totalSourceRows: number;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const parseSheet = <T>(name: string): T[] => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
  };

  const sheetNames = workbook.SheetNames;
  const isMultiSheet =
    sheetNames.includes("Categories") &&
    sheetNames.includes("Products") &&
    sheetNames.includes("Variants");

  if (isMultiSheet) {
    const categories = parseSheet<RawCategoryRow>("Categories");
    const products = parseSheet<RawProductRow>("Products");
    const variants = parseSheet<RawVariantRow>("Variants");
    return {
      categories,
      products,
      variants,
      isUnified: false,
      totalSourceRows: categories.length + products.length + variants.length,
    };
  }

  // ─── Unified Single Sheet Format ───
  let dataSheetName = sheetNames.find((n: string) => {
    const lower = n.toLowerCase();
    return (
      (lower.includes("catalog") || lower.includes("product") || lower.includes("item")) &&
      !lower.includes("instruction")
    );
  });

  if (!dataSheetName) {
    dataSheetName =
      sheetNames.find((n: string) => !n.toLowerCase().includes("instruction")) ||
      sheetNames[0];
  }

  const rawRows = parseSheet<RawUnifiedRow>(dataSheetName);
  const categories: RawCategoryRow[] = [];
  const products: RawProductRow[] = [];
  const variants: RawVariantRow[] = [];

  const seenCatNames = new Set<string>();
  const seenProdSkus = new Set<string>();

  let lastCategory = "";
  let lastProductSku = "";
  let lastProductName = "";
  let lastProductDesc = "";
  let lastBrand = "";
  let lastHsn = "";

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];

    let cat = safeStr(row.category || row.category_name);
    let pSku = safeStr(row.product_sku);
    let pName = safeStr(row.product_name);
    let pDesc = safeStr(row.product_description || row.description);
    let brand = safeStr(row.brand);
    let hsn = safeStr(row.hsn_code);

    if (pSku) {
      lastProductSku = pSku;
      if (cat) lastCategory = cat;
      if (pName) lastProductName = pName;
      if (pDesc) lastProductDesc = pDesc;
      if (brand) lastBrand = brand;
      if (hsn) lastHsn = hsn;
    } else if (lastProductSku && (!pName || pName.toLowerCase() === lastProductName.toLowerCase())) {
      pSku = lastProductSku;
      if (!cat) cat = lastCategory;
      if (!pName) pName = lastProductName;
      if (!pDesc) pDesc = lastProductDesc;
      if (!brand) brand = lastBrand;
      if (!hsn) hsn = lastHsn;
    }

    // 1. Categories extraction
    if (cat) {
      let catName = cat;
      let parentCat: string | undefined = undefined;
      if (cat.includes(">")) {
        const parts = cat.split(">").map((s) => s.trim());
        parentCat = parts[0];
        catName = parts[1];
        if (parentCat && !seenCatNames.has(parentCat.toLowerCase())) {
          seenCatNames.add(parentCat.toLowerCase());
          categories.push({
            category_name: parentCat,
            description: "",
            sort_order: categories.length + 1,
          });
        }
      }

      if (!seenCatNames.has(catName.toLowerCase())) {
        seenCatNames.add(catName.toLowerCase());
        categories.push({
          category_name: catName,
          parent_category: parentCat,
          description: "",
          sort_order: categories.length + 1,
        });
      }
      cat = catName;
    }

    // 2. Products extraction
    if (pSku && !seenProdSkus.has(pSku.toUpperCase())) {
      seenProdSkus.add(pSku.toUpperCase());
      products.push({
        category_name: cat,
        product_name: pName,
        sku: pSku,
        base_price: row.price || row.base_price || 0,
        sale_price: row.sale_price,
        description: pDesc,
        brand,
        hsn_code: hsn,
      });
    } else if (!pSku && pName) {
      // Product specified without SKU
      products.push({
        category_name: cat,
        product_name: pName,
        sku: "",
        base_price: row.price || row.base_price || 0,
        sale_price: row.sale_price,
        description: pDesc,
        brand,
        hsn_code: hsn,
      });
    }

    // 3. Variants extraction
    const varSku = safeStr(row.variant_sku || row.sku);
    const varName = safeStr(row.variant_name);
    const unit = safeStr(row.unit);
    const unitValue = row.unit_value;
    const price = row.price || row.base_price;
    const stockQty = row.stock_qty || row.stock || 0;
    const reorderLevel = row.reorder_level || 10;
    const isDefault = row.is_default;

    if (pSku || varSku || varName) {
      variants.push({
        product_sku: pSku,
        variant_name: varName,
        unit,
        unit_value: unitValue,
        variant_sku: varSku,
        price,
        stock_qty: stockQty,
        reorder_level: reorderLevel,
        is_default: isDefault,
      });
    }
  }

  return {
    categories,
    products,
    variants,
    isUnified: true,
    totalSourceRows: rawRows.length,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const bulkImportService = {
  /**
   * Parse, validate, preview and import Excel data.
   * All inserts wrapped in a single DB transaction (all-or-nothing per run).
   */
  async importFromBuffer(
    buffer: Buffer,
    adminUserId?: bigint | null,
    dryRun = false
  ): Promise<ImportResult> {
    const {
      categories: rawCats,
      products: rawProds,
      variants: rawVars,
      isUnified,
      totalSourceRows,
    } = parseExcelBuffer(buffer);

    const sheetNameLabel = isUnified ? "Catalog" : undefined;

    const rejected: ImportRowResult[] = [];
    const preview: ImportPreviewItem[] = [];
    const importedCategories: string[] = [];
    const importedProducts: string[] = [];

    // ─── 1. Validate & Deduplicate Categories ───
    const categoryMap = new Map<string, bigint>(); // name (lower) -> DB id
    const usedCatSlugs = new Set<string>();
    const validCats: {
      name: string;
      slug: string;
      parentName?: string;
      description?: string;
      sortOrder: number;
    }[] = [];

    // Pre-load existing categories
    const existingCats = await db.productCategory.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, slug: true },
    });
    for (const cat of existingCats) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
      usedCatSlugs.add(cat.slug);
    }

    const seenCatNames = new Set<string>();
    for (let i = 0; i < rawCats.length; i++) {
      const row = rawCats[i];
      const name = safeStr(row.category_name);
      if (!name) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Categories",
          status: "rejected",
          name: "(empty)",
          reason: "category_name is required",
        });
        continue;
      }
      if (categoryMap.has(name.toLowerCase())) {
        // Already exists – recorded
        continue;
      }
      if (seenCatNames.has(name.toLowerCase())) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Categories",
          status: "rejected",
          name,
          reason: "Duplicate category name in sheet",
        });
        continue;
      }
      seenCatNames.add(name.toLowerCase());
      validCats.push({
        name,
        slug: makeUniqueSlug(name, usedCatSlugs),
        parentName: safeStr(row.parent_category) || undefined,
        description: safeStr(row.description) || undefined,
        sortOrder: safeNum(row.sort_order, 0),
      });
    }

    // ─── 2. Validate Products ───
    const productSkuToName = new Map<string, string>();
    const existingSkus = new Set<string>();
    const existingProductSkus = await db.product.findMany({
      where: { deleted_at: null },
      select: { sku: true },
    });
    for (const p of existingProductSkus) {
      if (p.sku) existingSkus.add(p.sku.toUpperCase());
    }

    const usedProdSlugs = new Set<string>();
    const existingProductSlugs = await db.product.findMany({
      where: { deleted_at: null },
      select: { slug: true },
    });
    for (const p of existingProductSlugs) usedProdSlugs.add(p.slug);

    const usedVarSlugs = new Set<string>();
    const existingVariantSlugs = await db.productVariant.findMany({
      where: { deleted_at: null },
      select: { slug: true },
    });
    for (const v of existingVariantSlugs) {
      if (v.slug) usedVarSlugs.add(v.slug);
    }

    type ValidProduct = {
      sku: string;
      name: string;
      slug: string;
      categoryName: string;
      basePrice: number;
      salePrice?: number;
      description?: string;
    };
    const validProds: ValidProduct[] = [];
    const seenProdSkus = new Set<string>();

    for (let i = 0; i < rawProds.length; i++) {
      const row = rawProds[i];
      const name = safeStr(row.product_name);
      const sku = safeStr(row.sku).toUpperCase();
      const categoryName = safeStr(row.category_name);

      let basePrice = safeNum(row.base_price);
      if (basePrice <= 0 && sku) {
        const matchingVars = rawVars.filter(
          (v) => safeStr(v.product_sku).toUpperCase() === sku && safeNum(v.price) > 0
        );
        if (matchingVars.length > 0) {
          basePrice = safeNum(matchingVars[0].price);
        }
      }

      if (!name) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name: sku || "(empty)",
          reason: "product_name is required",
        });
        continue;
      }
      if (!sku) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name: name || "(empty)",
          reason: `sku is required${name ? ` for "${name}"` : ""}`,
        });
        continue;
      }
      if (!categoryName) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name: sku,
          reason: "category_name is required",
        });
        continue;
      }
      if (basePrice <= 0) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name: sku,
          reason: "base_price or variant price must be > 0",
        });
        continue;
      }
      if (existingSkus.has(sku)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name,
          reason: `SKU "${sku}" already exists in database`,
        });
        continue;
      }
      if (seenProdSkus.has(sku)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Products",
          status: "rejected",
          name,
          reason: `Duplicate SKU "${sku}" in sheet`,
        });
        continue;
      }

      seenProdSkus.add(sku);
      existingSkus.add(sku);
      productSkuToName.set(sku, name);
      validProds.push({
        sku,
        name,
        slug: makeUniqueSlug(name, usedProdSlugs),
        categoryName,
        basePrice,
        salePrice: safeNum(row.sale_price, 0) > 0 ? safeNum(row.sale_price) : undefined,
        description: safeStr(row.description) || undefined,
      });
    }

    // ─── 3. Validate Variants ───
    type ValidVariant = {
      productSku: string;
      variantName: string;
      unit: string;
      unitValue: number;
      variantSku: string;
      price: number;
      stockQty: number;
      reorderLevel: number;
      isDefault: boolean;
    };
    const validVars: ValidVariant[] = [];
    const existingVarSkus = new Set<string>();
    const existingVariantSkus = await db.variantUnitPrice.findMany({
      select: { sku: true },
    });
    for (const v of existingVariantSkus) existingVarSkus.add(v.sku.toUpperCase());

    // Pre-load valid unit codes from DB for early validation
    const dbUnits = await db.product_units.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true },
    });
    const validUnitCodes = new Set(dbUnits.map((u) => u.code.toLowerCase()));
    const validUnitNames = new Set(dbUnits.map((u) => u.name.toLowerCase()));
    const validUnitList = dbUnits.map((u) => u.code).join(", ");

    const seenVarSkus = new Set<string>();
    const seenVarUnitValue = new Set<string>();
    const defaultSetFor = new Set<string>();

    for (let i = 0; i < rawVars.length; i++) {
      const row = rawVars[i];
      const productSku = safeStr(row.product_sku).toUpperCase();
      const variantName = safeStr(row.variant_name);
      const unit = safeStr(row.unit).toLowerCase();
      const unitValue = safeNum(row.unit_value);
      const variantSku = safeStr(row.variant_sku).toUpperCase();
      const price = safeNum(row.price);
      const stockQty = safeNum(row.stock_qty, 0);
      const reorderLevel = safeNum(row.reorder_level, 10);
      const isDefault = safeBool(row.is_default);

      if (!productSku) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku || "(empty)",
          reason: "product_sku is required",
        });
        continue;
      }
      if (!seenProdSkus.has(productSku) && !existingSkus.has(productSku)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `product_sku "${productSku}" not found in Products sheet or DB`,
        });
        continue;
      }
      if (!variantName) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku || "(empty)",
          reason: "variant_name is required",
        });
        continue;
      }
      if (!unit) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `unit is required. Valid codes: ${validUnitList}`,
        });
        continue;
      }
      if (!validUnitCodes.has(unit) && !validUnitNames.has(unit)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `Unknown unit "${unit}". Valid unit codes in DB: ${validUnitList}`,
        });
        continue;
      }
      if (unitValue <= 0) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: "unit_value must be > 0",
        });
        continue;
      }
      if (!variantSku) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: "(empty)",
          reason: "variant_sku is required",
        });
        continue;
      }
      if (price <= 0) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: "price must be > 0",
        });
        continue;
      }
      if (existingVarSkus.has(variantSku)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `Variant SKU "${variantSku}" already exists in database`,
        });
        continue;
      }
      if (seenVarSkus.has(variantSku)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `Duplicate variant_sku "${variantSku}" in sheet`,
        });
        continue;
      }

      const unitValKey = `${productSku}::${variantName.toLowerCase()}::${unit}::${unitValue}`;
      if (seenVarUnitValue.has(unitValKey)) {
        rejected.push({
          row: i + 2,
          sheet: sheetNameLabel ?? "Variants",
          status: "rejected",
          name: variantSku,
          reason: `Duplicate measurement ${unitValue}${unit} for variant "${variantName}" under product ${productSku}`,
        });
        continue;
      }

      seenVarSkus.add(variantSku);
      seenVarUnitValue.add(unitValKey);
      existingVarSkus.add(variantSku);
      if (isDefault) defaultSetFor.add(productSku);

      validVars.push({
        productSku,
        variantName,
        unit,
        unitValue,
        variantSku,
        price,
        stockQty,
        reorderLevel,
        isDefault,
      });
    }

    // ─── 4. Build Preview ───
    const varsByProductSku = new Map<string, typeof validVars>();
    for (const v of validVars) {
      if (!varsByProductSku.has(v.productSku)) varsByProductSku.set(v.productSku, []);
      varsByProductSku.get(v.productSku)!.push(v);
    }

    for (const prod of validProds) {
      const vars = varsByProductSku.get(prod.sku) ?? [];
      preview.push({
        categoryName: prod.categoryName,
        productName: prod.name,
        sku: prod.sku,
        variants: vars.map((v) => ({
          variantName: v.variantName,
          unit: v.unit,
          unitValue: v.unitValue,
          variantSku: v.variantSku,
          price: v.price,
          stockQty: v.stockQty,
          isDefault: v.isDefault,
        })),
      });
    }

    const totalRows = isUnified
      ? totalSourceRows
      : rawCats.length + rawProds.length + rawVars.length;
    const successCount = isUnified
      ? validVars.length
      : validCats.length + validProds.length + validVars.length;

    // Return early if dry run (preview only)
    if (dryRun) {
      return {
        totalRows,
        successCount,
        rejectedCount: rejected.length,
        preview,
        rejected,
        importedCategories: [],
        importedProducts: [],
      };
    }

    // ─── 5. Commit to DB ───
    await db.$transaction(async (tx) => {
      // 5a. Insert categories
      for (const cat of validCats) {
        let parentId: bigint | undefined;
        if (cat.parentName) {
          parentId = categoryMap.get(cat.parentName.toLowerCase());
        }
        const created = await tx.productCategory.create({
          data: {
            uuid: crypto.randomUUID(),
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            parentId: parentId ?? null,
            sortOrder: cat.sortOrder,
            isActive: true,
            status: true,
            created_by: adminUserId ?? null,
            updated_by: adminUserId ?? null,
          },
        });
        categoryMap.set(cat.name.toLowerCase(), created.id);
        importedCategories.push(cat.name);
      }

      // 5b. Fetch all units from DB once
      const units = await tx.product_units.findMany({
        select: { id: true, name: true, code: true },
      });
      const unitMap = new Map<string, bigint>();
      for (const u of units) {
        unitMap.set(u.code.toLowerCase(), u.id);
        unitMap.set(u.name.toLowerCase(), u.id);
      }

      // 5c. Insert products + variants
      for (const prod of validProds) {
        const catId = categoryMap.get(prod.categoryName.toLowerCase());
        const createdProd = await tx.product.create({
          data: {
            uuid: crypto.randomUUID(),
            name: prod.name,
            slug: prod.slug,
            sku: prod.sku,
            base_price: prod.basePrice,
            sale_price: prod.salePrice ?? null,
            categoryId: catId ? catId : null,
            isActive: true,
            status: true,
            created_by: adminUserId ?? null,
            updated_by: adminUserId ?? null,
          },
        });
        importedProducts.push(prod.name);

        // Variants for this product
        const vars = varsByProductSku.get(prod.sku) ?? [];

        // Group subvariants by variant_name (3-tier architecture: Product -> Variant -> UnitPrice)
        const variantsByName = new Map<string, typeof vars>();
        for (const v of vars) {
          const key = v.variantName.toLowerCase();
          if (!variantsByName.has(key)) variantsByName.set(key, []);
          variantsByName.get(key)!.push(v);
        }

        let isFirstVariant = true;
        for (const [, subvariants] of variantsByName) {
          const first = subvariants[0];
          const variantSlug = makeUniqueSlug(
            `${prod.slug}-${first.variantName}`,
            usedVarSlugs
          );

          let isVariantDefault = subvariants.some((sv) => sv.isDefault);
          if (isFirstVariant && !vars.some((v) => v.isDefault)) {
            isVariantDefault = true;
          }
          isFirstVariant = false;

          const createdVariant = await tx.productVariant.create({
            data: {
              uuid: crypto.randomUUID(),
              productId: createdProd.id,
              variant_name: first.variantName,
              slug: variantSlug,
              is_default: isVariantDefault,
              isActive: true,
              created_by: adminUserId ?? null,
              updated_by: adminUserId ?? null,
            },
          });

          // Ensure at least one subvariant in this variant is marked default
          if (!subvariants.some((sv) => sv.isDefault)) {
            subvariants[0].isDefault = true;
          }

          for (const sv of subvariants) {
            const unitId = unitMap.get(sv.unit);
            if (!unitId) continue; // Skip if unit not found in DB

            const createdVup = await tx.variantUnitPrice.create({
              data: {
                uuid: crypto.randomUUID(),
                variant_id: createdVariant.id,
                unit_id: unitId,
                unit_value: sv.unitValue,
                sku: sv.variantSku,
                base_price: sv.price,
                is_default: sv.isDefault,
                isActive: true,
                created_by: adminUserId ?? null,
                updated_by: adminUserId ?? null,
              },
            });

            await tx.inventory.create({
              data: {
                variantUnitPriceId: createdVup.id,
                quantity_available: sv.stockQty,
                quantity_reserved: 0,
                reorderLevel: sv.reorderLevel,
                is_active: true,
                created_by: adminUserId ?? null,
                updated_by: adminUserId ?? null,
              },
            });
          }
        }
      }
    });

    return {
      totalRows,
      successCount,
      rejectedCount: rejected.length,
      preview,
      rejected,
      importedCategories,
      importedProducts,
    };
  },
};
