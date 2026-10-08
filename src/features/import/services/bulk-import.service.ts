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
  category?: string;
  parent_category?: string;
  description?: string;
  sort_order?: number | string;
}

interface RawProductRow {
  category_name?: string;
  category?: string;
  product_name?: string;
  name?: string;
  sku?: string;
  product_sku?: string;
  base_price?: number | string;
  price?: number | string;
  sale_price?: number | string;
  description?: string;
  product_description?: string;
  brand?: string;
  hsn_code?: string;
}

interface RawVariantRow {
  product_sku?: string;
  sku?: string;
  variant_name?: string;
  name?: string;
  unit?: string;
  unit_value?: number | string;
  variant_sku?: string;
  price?: number | string;
  base_price?: number | string;
  stock_qty?: number | string;
  stock?: number | string;
  reorder_level?: number | string;
  is_default?: string | boolean | number;
  veg_type?: string;
  shelf_life?: string;
  short_description?: string;
}

interface RawUnifiedRow {
  category?: string;
  category_name?: string;
  product_name?: string;
  name?: string;
  product_sku?: string;
  product_description?: string;
  description?: string;
  brand?: string;
  hsn_code?: string;
  variant_name?: string;
  item_name?: string;
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
  is_default?: string | boolean | number;
  veg_type?: string;
  shelf_life?: string;
  short_description?: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return v != null ? String(v).trim() : "";
}

function safeBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = safeStr(v).toUpperCase();
  return s === "YES" || s === "TRUE" || s === "1";
}

function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((val) => safeStr(val) === "");
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

// ─── Service ─────────────────────────────────────────────────────────────────

export const bulkImportService = {
  /**
   * Parse, validate, preview and import Excel data with exact field validation matching form modals.
   * All inserts wrapped in a single DB transaction (all-or-nothing per run).
   */
  async importFromBuffer(
    buffer: Buffer,
    adminUserId?: bigint | null,
    dryRun = false
  ): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      return {
        totalRows: 0,
        successCount: 0,
        rejectedCount: 1,
        preview: [],
        rejected: [
          {
            row: 1,
            sheet: "Excel",
            status: "rejected",
            name: "File",
            reason: "The uploaded workbook does not contain any sheets.",
          },
        ],
        importedCategories: [],
        importedProducts: [],
      };
    }

    const parseSheet = <T>(name: string): T[] => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return [];
      return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
    };

    const isMultiSheet =
      sheetNames.includes("Categories") &&
      sheetNames.includes("Products") &&
      sheetNames.includes("Variants");

    // ─── Pre-load Database Lookups ───
    const [
      existingCategories,
      existingProductSkus,
      existingProductSlugs,
      existingVariantSlugs,
      existingVariantSkus,
      dbUnits,
      dbBrands,
      dbHsnCodes,
    ] = await Promise.all([
      db.productCategory.findMany({
        where: { deleted_at: null },
        select: { id: true, name: true, slug: true },
      }),
      db.product.findMany({
        where: { deleted_at: null },
        select: { id: true, sku: true, name: true },
      }),
      db.product.findMany({
        where: { deleted_at: null },
        select: { slug: true },
      }),
      db.productVariant.findMany({
        where: { deleted_at: null },
        select: { slug: true },
      }),
      db.variantUnitPrice.findMany({
        where: { deleted_at: null },
        select: { sku: true },
      }),
      db.product_units.findMany({
        where: { is_active: true },
        select: { id: true, name: true, code: true },
      }),
      db.productBrand.findMany({
        where: { deleted_at: null, isActive: true },
        select: { id: true, name: true },
      }),
      db.product_hsn_codes.findMany({
        where: { is_active: true },
        select: { id: true, code: true },
      }),
    ]);

    // Categories lookup
    const categoryMap = new Map<string, bigint>();
    const usedCatSlugs = new Set<string>();
    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
      usedCatSlugs.add(cat.slug);
    }

    // Products SKU lookup
    const existingDbProductSkus = new Set<string>();
    for (const p of existingProductSkus) {
      if (p.sku) existingDbProductSkus.add(p.sku.toUpperCase());
    }

    // Product & Variant slugs lookup
    const usedProdSlugs = new Set<string>();
    for (const p of existingProductSlugs) usedProdSlugs.add(p.slug);

    const usedVarSlugs = new Set<string>();
    for (const v of existingVariantSlugs) {
      if (v.slug) usedVarSlugs.add(v.slug);
    }

    // Variant SKU lookup
    const existingDbVariantSkus = new Set<string>();
    for (const v of existingVariantSkus) {
      if (v.sku) existingDbVariantSkus.add(v.sku.toUpperCase());
    }

    // Units lookup
    const unitMap = new Map<string, bigint>();
    const validUnitCodes = new Set<string>();
    const validUnitNames = new Set<string>();
    for (const u of dbUnits) {
      unitMap.set(u.code.toLowerCase(), u.id);
      unitMap.set(u.name.toLowerCase(), u.id);
      validUnitCodes.add(u.code.toLowerCase());
      validUnitNames.add(u.name.toLowerCase());
    }
    const validUnitList = dbUnits.map((u) => u.code).join(", ");

    // Brands lookup
    const brandMap = new Map<string, bigint>();
    for (const b of dbBrands) {
      brandMap.set(b.name.toLowerCase(), b.id);
    }

    // HSN Codes lookup
    const hsnMap = new Map<string, bigint>();
    for (const h of dbHsnCodes) {
      hsnMap.set(h.code.toLowerCase(), h.id);
    }

    const rejected: ImportRowResult[] = [];
    const preview: ImportPreviewItem[] = [];
    const importedCategories: string[] = [];
    const importedProducts: string[] = [];

    // Internal Valid structures
    type ValidCategory = {
      name: string;
      slug: string;
      parentName?: string;
      description?: string;
      sortOrder: number;
    };

    type ValidProduct = {
      sku: string;
      name: string;
      slug: string;
      categoryName: string;
      basePrice: number;
      salePrice?: number;
      description?: string;
      brandId?: bigint;
      hsnCodeId?: bigint;
    };

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
      vegType?: string;
      shelfLife?: string;
      shortDescription?: string;
    };

    const validCats: ValidCategory[] = [];
    const validProds: ValidProduct[] = [];
    const validVars: ValidVariant[] = [];

    const sheetSeenProductSkus = new Set<string>();
    const sheetSeenVariantSkus = new Set<string>();
    const sheetSeenCatNames = new Set<string>();
    const sheetSeenVarUnitValue = new Set<string>();

    let totalRows = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // BRANCH A: UNIFIED SINGLE SHEET
    // ─────────────────────────────────────────────────────────────────────────
    if (!isMultiSheet) {
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
      totalRows = rawRows.length;

      if (totalRows === 0) {
        return {
          totalRows: 0,
          successCount: 0,
          rejectedCount: 1,
          preview: [],
          rejected: [
            {
              row: 1,
              sheet: dataSheetName,
              status: "rejected",
              name: "(empty sheet)",
              reason: "The Excel sheet contains no data rows.",
            },
          ],
          importedCategories: [],
          importedProducts: [],
        };
      }

      let lastCategory = "";
      let lastProductSku = "";
      let lastProductName = "";
      let lastProductDesc = "";
      let lastBrand = "";
      let lastHsn = "";

      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2; // Header is Row 1, Data begins at Row 2

        if (isRowEmpty(row as Record<string, unknown>)) {
          // Skip purely blank rows
          continue;
        }

        let cat = safeStr(row.category || row.category_name);
        let pSku = safeStr(row.product_sku);
        let pName = safeStr(row.product_name || row.name);
        let pDesc = safeStr(row.product_description || row.description);
        let brand = safeStr(row.brand);
        let hsn = safeStr(row.hsn_code);

        // Variant / Item fields
        const varName = safeStr(row.variant_name || row.item_name);
        const unit = safeStr(row.unit).toLowerCase();
        const rawUnitVal = row.unit_value;
        const varSku = safeStr(row.variant_sku || row.sku);
        const rawPrice = row.price != null && row.price !== "" ? row.price : row.base_price;
        const rawStock = row.stock_qty != null && row.stock_qty !== "" ? row.stock_qty : row.stock;
        const rawReorder = row.reorder_level;
        const isDefault = safeBool(row.is_default);
        const vegType = safeStr(row.veg_type).toLowerCase();
        const shelfLife = safeStr(row.shelf_life);
        const shortDescription = safeStr(row.short_description);

        // Product Context Inheritance
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

        // ─── 1. Category Field Validation ───
        if (!cat) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName || pSku || `Row #${rowNum}`,
            reason: "Category is required",
          });
          continue;
        }

        let catName = cat;
        let parentCat: string | undefined = undefined;
        if (cat.includes(">")) {
          const parts = cat.split(">").map((s) => s.trim());
          parentCat = parts[0];
          catName = parts[1];

          if (!parentCat) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: cat,
              reason: "Parent category cannot be empty in category hierarchy",
            });
            continue;
          }
          if (parentCat.length > 150) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: parentCat,
              reason: "Parent category name cannot exceed 150 characters",
            });
            continue;
          }

          if (
            !categoryMap.has(parentCat.toLowerCase()) &&
            !sheetSeenCatNames.has(parentCat.toLowerCase())
          ) {
            sheetSeenCatNames.add(parentCat.toLowerCase());
            validCats.push({
              name: parentCat,
              slug: makeUniqueSlug(parentCat, usedCatSlugs),
              sortOrder: validCats.length + 1,
            });
          }
        }

        if (!catName) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: cat,
            reason: "Category name is required",
          });
          continue;
        }
        if (catName.length > 150) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: catName,
            reason: "Category name cannot exceed 150 characters",
          });
          continue;
        }

        if (
          !categoryMap.has(catName.toLowerCase()) &&
          !sheetSeenCatNames.has(catName.toLowerCase())
        ) {
          sheetSeenCatNames.add(catName.toLowerCase());
          validCats.push({
            name: catName,
            slug: makeUniqueSlug(catName, usedCatSlugs),
            parentName: parentCat,
            sortOrder: validCats.length + 1,
          });
        }
        cat = catName;

        // ─── 2. Product Field Validation ───
        if (!pName) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pSku || `Row #${rowNum}`,
            reason: "Product name is required",
          });
          continue;
        }
        if (pName.length > 200) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Product name cannot exceed 200 characters",
          });
          continue;
        }

        if (!pSku) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: `Product SKU is required for product "${pName}"`,
          });
          continue;
        }
        if (pSku.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Product SKU cannot exceed 100 characters",
          });
          continue;
        }

        const pSkuUpper = pSku.toUpperCase();
        if (existingDbProductSkus.has(pSkuUpper) && !sheetSeenProductSkus.has(pSkuUpper)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: `Product SKU "${pSkuUpper}" already exists in database`,
          });
          continue;
        }

        // Product level descriptions & references
        if (pDesc && pDesc.length > 2000) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Product description cannot exceed 2000 characters",
          });
          continue;
        }

        let brandId: bigint | undefined;
        if (brand) {
          if (brand.length > 150) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: pName,
              reason: "Brand name cannot exceed 150 characters",
            });
            continue;
          }
          brandId = brandMap.get(brand.toLowerCase());
        }

        let hsnCodeId: bigint | undefined;
        if (hsn) {
          if (hsn.length > 50) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: pName,
              reason: "HSN code cannot exceed 50 characters",
            });
            continue;
          }
          hsnCodeId = hsnMap.get(hsn.toLowerCase());
        }

        // Register Product if not registered yet
        if (!sheetSeenProductSkus.has(pSkuUpper)) {
          const numPrice = parseFloat(String(rawPrice ?? 0));
          const prodBasePrice = isNaN(numPrice) || numPrice < 0 ? 0 : numPrice;

          sheetSeenProductSkus.add(pSkuUpper);
          validProds.push({
            sku: pSkuUpper,
            name: pName,
            slug: makeUniqueSlug(pName, usedProdSlugs),
            categoryName: cat,
            basePrice: prodBasePrice,
            salePrice:
              row.sale_price != null && row.sale_price !== "" && !isNaN(parseFloat(String(row.sale_price)))
                ? parseFloat(String(row.sale_price))
                : undefined,
            description: pDesc || undefined,
            brandId,
            hsnCodeId,
          });
        }

        // ─── 3. Variant (Item) Field Validation ───
        if (!varName) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Variant name is required",
          });
          continue;
        }
        if (varName.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Variant name cannot exceed 100 characters",
          });
          continue;
        }

        if (vegType && !["veg", "nonveg", "vegan", "na"].includes(vegType)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: `Invalid vegType "${vegType}". Allowed values: veg, nonveg, vegan, na`,
          });
          continue;
        }

        if (shelfLife && shelfLife.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Best before / shelf life cannot exceed 100 characters",
          });
          continue;
        }

        if (shortDescription && shortDescription.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Short description cannot exceed 500 characters",
          });
          continue;
        }

        // ─── 4. Pack Size & Unit Price (Subvariant) Validation ───
        if (!unit) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku || varName,
            reason: `Unit is required. Valid unit codes: ${validUnitList}`,
          });
          continue;
        }
        if (!validUnitCodes.has(unit) && !validUnitNames.has(unit)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku || varName,
            reason: `Unknown unit "${unit}". Valid unit codes: ${validUnitList}`,
          });
          continue;
        }

        if (rawUnitVal == null || rawUnitVal === "") {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku || varName,
            reason: "Pack size (unit_value) is required",
          });
          continue;
        }
        const unitValNum = parseFloat(String(rawUnitVal));
        if (isNaN(unitValNum) || unitValNum <= 0) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku || varName,
            reason: "Pack size (unit_value) must be greater than 0",
          });
          continue;
        }
        if (unitValNum > 99999999.99) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku || varName,
            reason: "Pack size exceeds maximum allowed amount",
          });
          continue;
        }

        if (!varSku) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Variant SKU is required",
          });
          continue;
        }
        if (varSku.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSku,
            reason: "Variant SKU cannot exceed 100 characters",
          });
          continue;
        }

        const varSkuUpper = varSku.toUpperCase();
        if (existingDbVariantSkus.has(varSkuUpper)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: `Variant SKU "${varSkuUpper}" already exists in database`,
          });
          continue;
        }
        if (sheetSeenVariantSkus.has(varSkuUpper)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: `Duplicate Variant SKU "${varSkuUpper}" in sheet`,
          });
          continue;
        }

        if (rawPrice == null || rawPrice === "") {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: "Price is required",
          });
          continue;
        }
        const priceNum = parseFloat(String(rawPrice));
        if (isNaN(priceNum) || priceNum < 0) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: "Price cannot be negative",
          });
          continue;
        }
        if (priceNum === 0) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: "Price must be greater than 0",
          });
          continue;
        }
        if (priceNum > 99999999.99) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: "Price exceeds maximum allowed amount",
          });
          continue;
        }

        let stockQty = 0;
        if (rawStock != null && rawStock !== "") {
          const sNum = parseFloat(String(rawStock));
          if (isNaN(sNum) || sNum < 0) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varSkuUpper,
              reason: "Stock quantity must be greater than or equal to 0",
            });
            continue;
          }
          if (!Number.isInteger(sNum)) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varSkuUpper,
              reason: "Stock quantity must be an integer",
            });
            continue;
          }
          if (sNum > 2147483647) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varSkuUpper,
              reason: "Stock quantity exceeds maximum allowed limit",
            });
            continue;
          }
          stockQty = sNum;
        }

        let reorderLevel = 10;
        if (rawReorder != null && rawReorder !== "") {
          const rNum = parseFloat(String(rawReorder));
          if (isNaN(rNum) || rNum < 0 || !Number.isInteger(rNum)) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varSkuUpper,
              reason: "Reorder level must be an integer greater than or equal to 0",
            });
            continue;
          }
          reorderLevel = rNum;
        }

        const unitValKey = `${pSkuUpper}::${varName.toLowerCase()}::${unit}::${unitValNum}`;
        if (sheetSeenVarUnitValue.has(unitValKey)) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varSkuUpper,
            reason: `Duplicate measurement ${unitValNum}${unit} for variant "${varName}" under product "${pSkuUpper}"`,
          });
          continue;
        }

        sheetSeenVariantSkus.add(varSkuUpper);
        sheetSeenVarUnitValue.add(unitValKey);

        validVars.push({
          productSku: pSkuUpper,
          variantName: varName,
          unit,
          unitValue: unitValNum,
          variantSku: varSkuUpper,
          price: priceNum,
          stockQty,
          reorderLevel,
          isDefault,
          vegType: vegType || undefined,
          shelfLife: shelfLife || undefined,
          shortDescription: shortDescription || undefined,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BRANCH B: MULTI-SHEET FORMAT (Categories, Products, Variants)
    // ─────────────────────────────────────────────────────────────────────────
    else {
      const rawCats = parseSheet<RawCategoryRow>("Categories");
      const rawProds = parseSheet<RawProductRow>("Products");
      const rawVars = parseSheet<RawVariantRow>("Variants");
      totalRows = rawCats.length + rawProds.length + rawVars.length;

      // 1. Validate Categories Sheet
      for (let i = 0; i < rawCats.length; i++) {
        const row = rawCats[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const name = safeStr(row.category_name || row.category);
        if (!name) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name: "(empty)",
            reason: "Category name is required",
          });
          continue;
        }
        if (name.length > 150) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: "Category name cannot exceed 150 characters",
          });
          continue;
        }

        const parentName = safeStr(row.parent_category);
        if (parentName && parentName.toLowerCase() === name.toLowerCase()) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: "Category cannot be its own parent",
          });
          continue;
        }

        const desc = safeStr(row.description);
        if (desc && desc.length > 2000) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: "Description cannot exceed 2000 characters",
          });
          continue;
        }

        let sortOrder = validCats.length + 1;
        if (row.sort_order != null && row.sort_order !== "") {
          const sNum = parseFloat(String(row.sort_order));
          if (isNaN(sNum) || !Number.isInteger(sNum)) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: "Sort order must be an integer",
            });
            continue;
          }
          if (sNum < 0) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: "Sort order cannot be negative",
            });
            continue;
          }
          if (sNum > 100) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: "Sort order cannot exceed 100",
            });
            continue;
          }
          sortOrder = sNum;
        }

        if (categoryMap.has(name.toLowerCase())) {
          continue; // Already exists in DB
        }

        if (sheetSeenCatNames.has(name.toLowerCase())) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: "Duplicate category name in sheet",
          });
          continue;
        }

        sheetSeenCatNames.add(name.toLowerCase());
        validCats.push({
          name,
          slug: makeUniqueSlug(name, usedCatSlugs),
          parentName: parentName || undefined,
          description: desc || undefined,
          sortOrder,
        });
      }

      // 2. Validate Products Sheet
      for (let i = 0; i < rawProds.length; i++) {
        const row = rawProds[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const name = safeStr(row.product_name || row.name);
        const sku = safeStr(row.sku || row.product_sku);
        const categoryName = safeStr(row.category_name || row.category);

        if (!name) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name: sku || "(empty)",
            reason: "Product name is required",
          });
          continue;
        }
        if (name.length > 200) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: "Product name cannot exceed 200 characters",
          });
          continue;
        }

        if (!sku) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: `Product SKU is required for "${name}"`,
          });
          continue;
        }
        if (sku.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name: sku,
            reason: "Product SKU cannot exceed 100 characters",
          });
          continue;
        }

        if (!categoryName) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: "Category name is required",
          });
          continue;
        }

        const skuUpper = sku.toUpperCase();
        if (existingDbProductSkus.has(skuUpper)) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: `SKU "${skuUpper}" already exists in database`,
          });
          continue;
        }
        if (sheetSeenProductSkus.has(skuUpper)) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: `Duplicate SKU "${skuUpper}" in sheet`,
          });
          continue;
        }

        let basePrice = 0;
        const rawP = row.base_price != null && row.base_price !== "" ? row.base_price : row.price;
        if (rawP != null && rawP !== "") {
          const pNum = parseFloat(String(rawP));
          if (isNaN(pNum) || pNum < 0) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name: skuUpper,
              reason: "Base price cannot be negative",
            });
            continue;
          }
          if (pNum > 99999999.99) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name: skuUpper,
              reason: "Price exceeds maximum allowed amount",
            });
            continue;
          }
          basePrice = pNum;
        }

        const desc = safeStr(row.description || row.product_description);
        if (desc && desc.length > 2000) {
          rejected.push({
            row: rowNum,
            sheet: "Products",
            status: "rejected",
            name,
            reason: "Description cannot exceed 2000 characters",
          });
          continue;
        }

        sheetSeenProductSkus.add(skuUpper);
        validProds.push({
          sku: skuUpper,
          name,
          slug: makeUniqueSlug(name, usedProdSlugs),
          categoryName,
          basePrice,
          salePrice:
            row.sale_price != null && row.sale_price !== "" && !isNaN(parseFloat(String(row.sale_price)))
              ? parseFloat(String(row.sale_price))
              : undefined,
          description: desc || undefined,
        });
      }

      // 3. Validate Variants Sheet
      for (let i = 0; i < rawVars.length; i++) {
        const row = rawVars[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const productSku = safeStr(row.product_sku || row.sku).toUpperCase();
        const variantName = safeStr(row.variant_name || row.name);
        const unit = safeStr(row.unit).toLowerCase();
        const rawUnitVal = row.unit_value;
        const variantSku = safeStr(row.variant_sku).toUpperCase();
        const rawPrice = row.price != null && row.price !== "" ? row.price : row.base_price;
        const rawStock = row.stock_qty != null && row.stock_qty !== "" ? row.stock_qty : row.stock;
        const rawReorder = row.reorder_level;
        const isDefault = safeBool(row.is_default);

        if (!productSku) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || "(empty)",
            reason: "Product SKU is required",
          });
          continue;
        }
        if (!sheetSeenProductSkus.has(productSku) && !existingDbProductSkus.has(productSku)) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || productSku,
            reason: `Product SKU "${productSku}" not found in Products sheet or database`,
          });
          continue;
        }

        if (!variantName) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || productSku,
            reason: "Variant name is required",
          });
          continue;
        }
        if (variantName.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantName,
            reason: "Variant name cannot exceed 100 characters",
          });
          continue;
        }

        if (!unit) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || variantName,
            reason: `Unit is required. Valid units: ${validUnitList}`,
          });
          continue;
        }
        if (!validUnitCodes.has(unit) && !validUnitNames.has(unit)) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || variantName,
            reason: `Unknown unit "${unit}". Valid unit codes: ${validUnitList}`,
          });
          continue;
        }

        if (rawUnitVal == null || rawUnitVal === "") {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || variantName,
            reason: "Pack size (unit_value) is required",
          });
          continue;
        }
        const unitValNum = parseFloat(String(rawUnitVal));
        if (isNaN(unitValNum) || unitValNum <= 0) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || variantName,
            reason: "Pack size (unit_value) must be greater than 0",
          });
          continue;
        }
        if (unitValNum > 99999999.99) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku || variantName,
            reason: "Pack size exceeds maximum allowed amount",
          });
          continue;
        }

        if (!variantSku) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantName,
            reason: "Variant SKU is required",
          });
          continue;
        }
        if (variantSku.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: "Variant SKU cannot exceed 100 characters",
          });
          continue;
        }
        if (existingDbVariantSkus.has(variantSku)) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: `Variant SKU "${variantSku}" already exists in database`,
          });
          continue;
        }
        if (sheetSeenVariantSkus.has(variantSku)) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: `Duplicate Variant SKU "${variantSku}" in sheet`,
          });
          continue;
        }

        if (rawPrice == null || rawPrice === "") {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: "Price is required",
          });
          continue;
        }
        const priceNum = parseFloat(String(rawPrice));
        if (isNaN(priceNum) || priceNum <= 0) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: "Price must be greater than 0",
          });
          continue;
        }
        if (priceNum > 99999999.99) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: "Price exceeds maximum allowed amount",
          });
          continue;
        }

        let stockQty = 0;
        if (rawStock != null && rawStock !== "") {
          const sNum = parseFloat(String(rawStock));
          if (isNaN(sNum) || sNum < 0 || !Number.isInteger(sNum)) {
            rejected.push({
              row: rowNum,
              sheet: "Variants",
              status: "rejected",
              name: variantSku,
              reason: "Stock quantity must be an integer greater than or equal to 0",
            });
            continue;
          }
          stockQty = sNum;
        }

        let reorderLevel = 10;
        if (rawReorder != null && rawReorder !== "") {
          const rNum = parseFloat(String(rawReorder));
          if (isNaN(rNum) || rNum < 0 || !Number.isInteger(rNum)) {
            rejected.push({
              row: rowNum,
              sheet: "Variants",
              status: "rejected",
              name: variantSku,
              reason: "Reorder level must be an integer greater than or equal to 0",
            });
            continue;
          }
          reorderLevel = rNum;
        }

        const unitValKey = `${productSku}::${variantName.toLowerCase()}::${unit}::${unitValNum}`;
        if (sheetSeenVarUnitValue.has(unitValKey)) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantSku,
            reason: `Duplicate measurement ${unitValNum}${unit} for variant "${variantName}" under product "${productSku}"`,
          });
          continue;
        }

        sheetSeenVariantSkus.add(variantSku);
        sheetSeenVarUnitValue.add(unitValKey);

        validVars.push({
          productSku,
          variantName,
          unit,
          unitValue: unitValNum,
          variantSku,
          price: priceNum,
          stockQty,
          reorderLevel,
          isDefault,
        });
      }
    }

    // ─── 5. Build Valid Preview Data ───
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

    const successCount = validVars.length;

    // Return early if preview/dry-run mode
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

    // ─── 6. Commit Valid Records to Database in Transaction ───
    await db.$transaction(async (tx) => {
      // 6a. Insert categories
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

      // 6b. Insert products + variants
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
            brandId: prod.brandId ?? null,
            hsn_code_id: prod.hsnCodeId ?? null,
            isActive: true,
            status: true,
            created_by: adminUserId ?? null,
            updated_by: adminUserId ?? null,
          },
        });
        importedProducts.push(prod.name);

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
              shelf_life: first.shelfLife ?? null,
              short_description: first.shortDescription ?? null,
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
            if (!unitId) continue;

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
