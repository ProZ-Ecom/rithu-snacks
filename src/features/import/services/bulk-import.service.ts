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
  categoryCode?: string;
  productName: string;
  productCode?: string;
  sku: string;
  brand?: string;
  variants: {
    variantName: string;
    variantCode?: string;
    vegType?: string;
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
  category_code?: string;
  category_slug?: string;
  slug?: string;
  parent_category?: string;
  description?: string;
  category_description?: string;
  image?: string;
  category_image?: string;
  icon?: string;
  category_icon?: string;
  sort_order?: number | string;
  category_sort_order?: number | string;
}

interface RawProductRow {
  category_name?: string;
  category?: string;
  category_code?: string;
  product_name?: string;
  name?: string;
  product_code?: string;
  product_slug?: string;
  slug?: string;
  product_sku?: string;
  sku?: string;
  brand?: string;
  brand_name?: string;
  hsn_code?: string;
  hsn?: string;
  product_description?: string;
  description?: string;
  product_image?: string;
  image_url?: string;
  base_price?: number | string;
  price?: number | string;
  sale_price?: number | string;
}

interface RawVariantRow {
  product_sku?: string;
  sku?: string;
  product_code?: string;
  item_name?: string;
  variant_name?: string;
  name?: string;
  item_code?: string;
  variant_code?: string;
  variant_slug?: string;
  slug?: string;
  veg_type?: string;
  dietary_type?: string;
  shelf_life?: string;
  best_before?: string;
  is_featured?: string | boolean | number;
  featured?: string | boolean | number;
  is_ready_to_mix?: string | boolean | number;
  ready_to_mix?: string | boolean | number;
  cooking_recipe?: string;
  recipe?: string;
  short_description?: string;
  item_description?: string;
  variant_description?: string;
  description?: string;
  ingredients?: string;
  item_image?: string;
  variant_image?: string;
  out_of_stock?: string | boolean | number;
  unit?: string;
  unit_code?: string;
  unit_value?: number | string;
  pack_size?: number | string;
  variant_sku?: string;
  pack_sku?: string;
  price?: number | string;
  base_price?: number | string;
  stock_qty?: number | string;
  stock?: number | string;
  reorder_level?: number | string;
  is_default?: string | boolean | number;
  is_active?: string | boolean | number;
}

interface RawUnifiedRow {
  // Category fields
  category?: string;
  category_name?: string;
  category_code?: string;
  category_slug?: string;
  category_description?: string;
  category_image?: string;
  category_icon?: string;
  icon?: string;
  category_sort_order?: number | string;
  sort_order?: number | string;

  // Product fields
  product_name?: string;
  name?: string;
  product_code?: string;
  product_slug?: string;
  product_sku?: string;
  sku?: string;
  brand?: string;
  brand_name?: string;
  hsn_code?: string;
  hsn?: string;
  product_description?: string;
  description?: string;
  product_image?: string;
  image_url?: string;
  price?: number | string;
  base_price?: number | string;
  sale_price?: number | string;

  // Item / Variant fields
  item_name?: string;
  variant_name?: string;
  item_code?: string;
  variant_code?: string;
  variant_slug?: string;
  veg_type?: string;
  dietary_type?: string;
  shelf_life?: string;
  best_before?: string;
  is_featured?: string | boolean | number;
  featured?: string | boolean | number;
  is_ready_to_mix?: string | boolean | number;
  ready_to_mix?: string | boolean | number;
  cooking_recipe?: string;
  recipe?: string;
  short_description?: string;
  item_description?: string;
  variant_description?: string;
  ingredients?: string;
  item_image?: string;
  variant_image?: string;
  out_of_stock?: string | boolean | number;

  // Units & Pricing fields
  unit?: string;
  unit_code?: string;
  unit_value?: number | string;
  pack_size?: number | string;
  variant_sku?: string;
  pack_sku?: string;
  stock_qty?: number | string;
  stock?: number | string;
  reorder_level?: number | string;
  is_default?: string | boolean | number;
  is_active?: string | boolean | number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return v != null ? String(v).trim() : "";
}

function safeBool(v: unknown, defaultVal = false): boolean {
  if (v == null || v === "") return defaultVal;
  if (typeof v === "boolean") return v;
  const s = safeStr(v).toUpperCase();
  return s === "YES" || s === "TRUE" || s === "1";
}

function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((val) => safeStr(val) === "");
}

/**
 * Normalizes user input for dietary type to 'veg' | 'nonveg' | 'vegan' | 'na'.
 * Accepts variants like 'vegetarian', 'non-veg', 'vegan', 'na', etc.
 */
function parseVegType(raw: string): "veg" | "nonveg" | "vegan" | "na" | null {
  const clean = safeStr(raw).toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return "veg";
  if (clean === "veg" || clean === "vegetarian") return "veg";
  if (clean === "nonveg" || clean === "nonvegetarian") return "nonveg";
  if (clean === "vegan") return "vegan";
  if (clean === "na" || clean === "notapplicable" || clean === "none") return "na";
  return null;
}

function makeUniqueSlug(base: string, existing: Set<string>): string {
  let slug = slugify(base).slice(0, 160);
  if (!slug) slug = "item";
  let attempt = slug;
  let i = 2;
  while (existing.has(attempt.toUpperCase())) {
    attempt = `${slug}-${i++}`;
  }
  existing.add(attempt.toUpperCase());
  return attempt;
}

function makeUniqueCode(base: string, existing: Set<string>, maxLen = 160): string {
  let code = base
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  if (!code) code = "CODE";
  let attempt = code;
  let i = 2;
  while (existing.has(attempt.toUpperCase())) {
    attempt = `${code}_${i++}`.slice(0, maxLen);
  }
  existing.add(attempt.toUpperCase());
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
        select: { id: true, sku: true, name: true, slug: true },
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
        select: { id: true, name: true, slug: true },
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
      categoryMap.set(cat.slug.toLowerCase(), cat.id);
      usedCatSlugs.add(cat.slug.toUpperCase());
    }

    // Products SKU & Slug lookup
    const existingDbProductSkus = new Set<string>();
    const usedProdSlugs = new Set<string>();
    for (const p of existingProductSkus) {
      if (p.sku) existingDbProductSkus.add(p.sku.toUpperCase());
      if (p.slug) usedProdSlugs.add(p.slug.toUpperCase());
    }
    for (const p of existingProductSlugs) {
      if (p.slug) usedProdSlugs.add(p.slug.toUpperCase());
    }

    // Variant Slugs lookup
    const usedVarSlugs = new Set<string>();
    for (const v of existingVariantSlugs) {
      if (v.slug) usedVarSlugs.add(v.slug.toUpperCase());
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
    const usedBrandSlugs = new Set<string>();
    for (const b of dbBrands) {
      brandMap.set(b.name.toLowerCase(), b.id);
      if (b.slug) usedBrandSlugs.add(b.slug.toUpperCase());
    }
    const defaultBrandId = dbBrands.length > 0 ? dbBrands[0].id : undefined;
    const defaultBrandName = dbBrands.length > 0 ? dbBrands[0].name : undefined;

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
      icon?: string;
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
      brandName?: string;
      brandId?: bigint;
      hsnCode?: string;
      hsnCodeId?: bigint;
      productImage?: string;
    };

    type ValidVariant = {
      productSku: string;
      variantName: string;
      variantCode: string;
      unit: string;
      unitValue: number;
      variantSku: string;
      price: number;
      stockQty: number;
      reorderLevel: number;
      isDefault: boolean;
      vegType: "veg" | "nonveg" | "vegan" | "na";
      shelfLife?: string;
      isFeatured: boolean;
      isReadyToMix: boolean;
      cookingRecipe?: string;
      shortDescription?: string;
      description?: string;
      ingredients?: string;
      itemImage?: string;
      outOfStock: boolean;
      isActive: boolean;
    };

    const validCats: ValidCategory[] = [];
    const validProds: ValidProduct[] = [];
    const validVars: ValidVariant[] = [];

    const sheetSeenProductSkus = new Set<string>();
    const sheetSeenProductCodes = new Set<string>();
    const sheetSeenVariantSkus = new Set<string>();
    const sheetSeenVariantCodes = new Set<string>();
    const sheetSeenCatNames = new Set<string>();
    const sheetSeenCatCodes = new Set<string>();
    const sheetSeenVarUnitValue = new Set<string>();

    let totalRows = 0;

    // Detect multi-sheet vs unified sheet
    const catalogSheetName = sheetNames.find((n: string) => {
      const lower = n.toLowerCase();
      return (
        (lower.includes("catalog") || lower.includes("product") || lower.includes("item")) &&
        !lower.includes("instruction")
      );
    });

    const isMultiSheet =
      !catalogSheetName &&
      sheetNames.includes("Categories") &&
      sheetNames.includes("Products") &&
      (sheetNames.includes("Variants") || sheetNames.includes("Items"));

    // ─────────────────────────────────────────────────────────────────────────
    // BRANCH A: UNIFIED SINGLE SHEET
    // ─────────────────────────────────────────────────────────────────────────
    if (!isMultiSheet) {
      let dataSheetName = catalogSheetName;
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

      // State variables for Product Context & Item Context Inheritance
      let lastCategory = "";
      let lastCategoryCode = "";
      let lastCategoryDesc = "";
      let lastCategoryImage = "";
      let lastCategorySort = 0;

      let lastProductSku = "";
      let lastProductName = "";
      let lastProductCode = "";
      let lastProductDesc = "";
      let lastBrand = "";
      let lastHsn = "";
      let lastProductImage = "";

      let lastItemName = "";
      let lastItemCode = "";
      let lastVegType: "veg" | "nonveg" | "vegan" | "na" = "veg";
      let lastShelfLife = "";
      let lastIsFeatured = false;
      let lastIsReadyToMix = false;
      let lastCookingRecipe = "";
      let lastShortDesc = "";
      let lastItemDesc = "";
      let lastIngredients = "";
      let lastItemImage = "";

      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2; // Header is Row 1, Data begins at Row 2

        if (isRowEmpty(row as Record<string, unknown>)) {
          // Skip purely blank rows
          continue;
        }

        // ── Raw field extraction with aliases ──
        let cat = safeStr(row.category_name || row.category);
        let catCode = safeStr(row.category_code || row.category_slug);
        let catDesc = safeStr(row.category_description);
        let catImage = safeStr(row.category_image || row.category_icon || row.icon);
        let rawCatSort = row.category_sort_order ?? row.sort_order;

        let pSku = safeStr(row.product_sku || row.sku);
        let pName = safeStr(row.product_name || row.name);
        let pCode = safeStr(row.product_code || row.product_slug);
        let brand = safeStr(row.brand || row.brand_name);
        let hsn = safeStr(row.hsn_code || row.hsn);
        let pDesc = safeStr(row.product_description || row.description);
        let pImage = safeStr(row.product_image || row.image_url);

        let varName = safeStr(row.item_name || row.variant_name);
        let varCode = safeStr(row.item_code || row.variant_code || row.variant_slug);
        let rawVegType = safeStr(row.veg_type || row.dietary_type);
        let shelfLife = safeStr(row.shelf_life || row.best_before);
        let isFeatured = safeBool(row.is_featured ?? row.featured, false);
        let isReadyToMix = safeBool(row.is_ready_to_mix ?? row.ready_to_mix, false);
        let cookingRecipe = safeStr(row.cooking_recipe || row.recipe);
        let shortDesc = safeStr(row.short_description);
        let itemDesc = safeStr(row.item_description || row.variant_description);
        let ingredients = safeStr(row.ingredients);
        let itemImage = safeStr(row.item_image || row.variant_image);
        let outOfStock = safeBool(row.out_of_stock, false);
        let isActive = safeBool(row.is_active, true);

        const unit = safeStr(row.unit || row.unit_code).toLowerCase();
        const rawUnitVal = row.unit_value ?? row.pack_size;
        const varSku = safeStr(row.variant_sku || row.pack_sku);
        const rawPrice = row.price != null && row.price !== "" ? row.price : row.base_price;
        const rawStock = row.stock_qty != null && row.stock_qty !== "" ? row.stock_qty : row.stock;
        const rawReorder = row.reorder_level;
        const isDefault = safeBool(row.is_default, false);

        // ── Product Context Inheritance ──
        if (pSku) {
          lastProductSku = pSku;
          if (cat) lastCategory = cat;
          if (catCode) lastCategoryCode = catCode;
          if (catDesc) lastCategoryDesc = catDesc;
          if (catImage) lastCategoryImage = catImage;
          if (rawCatSort != null && rawCatSort !== "") lastCategorySort = Number(rawCatSort) || 0;
          if (pName) lastProductName = pName;
          if (pCode) lastProductCode = pCode;
          if (brand) lastBrand = brand;
          if (hsn) lastHsn = hsn;
          if (pDesc) lastProductDesc = pDesc;
          if (pImage) lastProductImage = pImage;
        } else if (lastProductSku && (!pName || pName.toLowerCase() === lastProductName.toLowerCase())) {
          pSku = lastProductSku;
          if (!cat) cat = lastCategory;
          if (!catCode) catCode = lastCategoryCode;
          if (!catDesc) catDesc = lastCategoryDesc;
          if (!catImage) catImage = lastCategoryImage;
          if (rawCatSort == null || rawCatSort === "") rawCatSort = lastCategorySort;
          if (!pName) pName = lastProductName;
          if (!pCode) pCode = lastProductCode;
          if (!brand) brand = lastBrand;
          if (!hsn) hsn = lastHsn;
          if (!pDesc) pDesc = lastProductDesc;
          if (!pImage) pImage = lastProductImage;
        }

        // ── Item Context Inheritance ──
        if (varName) {
          lastItemName = varName;
          if (varCode) lastItemCode = varCode;
          if (rawVegType) lastVegType = parseVegType(rawVegType) || "veg";
          if (shelfLife) lastShelfLife = shelfLife;
          lastIsFeatured = isFeatured;
          lastIsReadyToMix = isReadyToMix;
          if (cookingRecipe) lastCookingRecipe = cookingRecipe;
          if (shortDesc) lastShortDesc = shortDesc;
          if (itemDesc) lastItemDesc = itemDesc;
          if (ingredients) lastIngredients = ingredients;
          if (itemImage) lastItemImage = itemImage;
        } else if (lastItemName && pSku.toUpperCase() === lastProductSku.toUpperCase()) {
          varName = lastItemName;
          if (!varCode) varCode = lastItemCode;
          if (!rawVegType) rawVegType = lastVegType;
          if (!shelfLife) shelfLife = lastShelfLife;
          isFeatured = lastIsFeatured;
          isReadyToMix = lastIsReadyToMix;
          if (!cookingRecipe) cookingRecipe = lastCookingRecipe;
          if (!shortDesc) shortDesc = lastShortDesc;
          if (!itemDesc) itemDesc = lastItemDesc;
          if (!ingredients) ingredients = lastIngredients;
          if (!itemImage) itemImage = lastItemImage;
        }

        // ─── 1. Category Field Validation ───
        if (!cat) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName || pSku || `Row #${rowNum}`,
            reason: "Category name is required",
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
            const parentSlug = makeUniqueCode(parentCat, usedCatSlugs, 170);
            sheetSeenCatNames.add(parentCat.toLowerCase());
            sheetSeenCatCodes.add(parentSlug.toUpperCase());
            validCats.push({
              name: parentCat,
              slug: parentSlug,
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

        // Category Code Validation (from Create Category schema)
        let finalCatCode = catCode;
        if (finalCatCode) {
          if (!/^[A-Za-z0-9_]+$/.test(finalCatCode)) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: catName,
              reason: `Category code "${finalCatCode}" can only contain letters, numbers, and underscores (no spaces or other special characters)`,
            });
            continue;
          }
          if (finalCatCode.length > 170) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: catName,
              reason: "Category code cannot exceed 170 characters",
            });
            continue;
          }
        } else {
          finalCatCode = makeUniqueCode(catName, usedCatSlugs, 170);
        }

        if (catDesc && catDesc.length > 2000) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: catName,
            reason: "Category description cannot exceed 2000 characters",
          });
          continue;
        }

        if (catImage && catImage.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: catName,
            reason: "Category image path cannot exceed 500 characters",
          });
          continue;
        }

        let catSortOrder = validCats.length + 1;
        if (rawCatSort != null && rawCatSort !== "") {
          const sNum = parseFloat(String(rawCatSort));
          if (isNaN(sNum) || !Number.isInteger(sNum) || sNum < 0 || sNum > 100) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: catName,
              reason: "Category sort order must be an integer between 0 and 100",
            });
            continue;
          }
          catSortOrder = sNum;
        }

        if (
          !categoryMap.has(catName.toLowerCase()) &&
          !sheetSeenCatNames.has(catName.toLowerCase())
        ) {
          sheetSeenCatNames.add(catName.toLowerCase());
          sheetSeenCatCodes.add(finalCatCode.toUpperCase());
          usedCatSlugs.add(finalCatCode.toUpperCase());
          validCats.push({
            name: catName,
            slug: finalCatCode.toUpperCase(),
            parentName: parentCat,
            description: catDesc || undefined,
            icon: catImage || undefined,
            sortOrder: catSortOrder,
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

        // Product Code Validation (from Create Product schema)
        let finalProdCode = pCode ? pCode.toUpperCase().replace(/\s+/g, "_") : "";
        if (finalProdCode) {
          if (finalProdCode.length > 220) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: pName,
              reason: "Product code cannot exceed 220 characters",
            });
            continue;
          }
          if (
            usedProdSlugs.has(finalProdCode) &&
            !sheetSeenProductCodes.has(finalProdCode)
          ) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: pName,
              reason: `Product code "${finalProdCode}" already exists in database`,
            });
            continue;
          }
        } else {
          finalProdCode = makeUniqueCode(
            `${finalCatCode}_${pSkuUpper.replace(/[^A-Z0-9_]/g, "_")}`,
            usedProdSlugs,
            220
          );
        }

        // Brand lookup & linking (link if exists in DB, otherwise null / default)
        let brandId: bigint | undefined = defaultBrandId;
        let matchedBrandName: string | undefined = defaultBrandName;
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
          const foundId = brandMap.get(brand.toLowerCase());
          if (foundId) {
            brandId = foundId;
            matchedBrandName = brand;
          } else {
            // Not registered by admin yet - do not auto-create and do not reject
            matchedBrandName = brand;
            brandId = defaultBrandId;
          }
        }

        // HSN Code lookup & linking (link if exists in DB, otherwise null)
        let hsnCodeId: bigint | undefined;
        let matchedHsnCode: string | undefined;
        if (hsn) {
          if (hsn.length > 20) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: pName,
              reason: "HSN code cannot exceed 20 characters",
            });
            continue;
          }
          const foundHsnId = hsnMap.get(hsn.toLowerCase());
          if (foundHsnId) {
            hsnCodeId = foundHsnId;
            matchedHsnCode = hsn;
          } else {
            // Not registered by admin yet - do not auto-create and do not reject
            matchedHsnCode = hsn;
            hsnCodeId = undefined;
          }
        }

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

        if (pImage && pImage.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Product image URL cannot exceed 500 characters",
          });
          continue;
        }

        // Register Product if not registered yet
        if (!sheetSeenProductSkus.has(pSkuUpper)) {
          const numPrice = parseFloat(String(rawPrice ?? 0));
          const prodBasePrice = isNaN(numPrice) || numPrice < 0 ? 0 : numPrice;

          sheetSeenProductSkus.add(pSkuUpper);
          sheetSeenProductCodes.add(finalProdCode);
          usedProdSlugs.add(finalProdCode);

          validProds.push({
            sku: pSkuUpper,
            name: pName,
            slug: finalProdCode,
            categoryName: cat,
            basePrice: prodBasePrice,
            salePrice:
              row.sale_price != null && row.sale_price !== "" && !isNaN(parseFloat(String(row.sale_price)))
                ? parseFloat(String(row.sale_price))
                : undefined,
            description: pDesc || undefined,
            brandName: matchedBrandName,
            brandId,
            hsnCode: matchedHsnCode,
            hsnCodeId,
            productImage: pImage || undefined,
          });
        }

        // ─── 3. Variant (Item) Field Validation ───
        if (!varName) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: pName,
            reason: "Item / Variant name is required",
          });
          continue;
        }
        if (varName.length > 100) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Item name cannot exceed 100 characters",
          });
          continue;
        }

        // Item Code Validation (from Create Item schema)
        let finalItemCode = varCode ? varCode.toUpperCase().replace(/\s+/g, "_") : "";
        if (finalItemCode) {
          if (finalItemCode.length > 255) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varName,
              reason: "Item code cannot exceed 255 characters",
            });
            continue;
          }
          if (
            usedVarSlugs.has(finalItemCode) &&
            !sheetSeenVariantCodes.has(finalItemCode)
          ) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varName,
              reason: `Item code "${finalItemCode}" already exists in database`,
            });
            continue;
          }
        } else {
          finalItemCode = makeUniqueCode(
            `${finalProdCode}_${slugify(varName).replace(/-/g, "_").toUpperCase()}`,
            usedVarSlugs,
            250
          );
        }

        // Dietary Type (veg_type) Validation
        const parsedVeg = parseVegType(rawVegType);
        if (!parsedVeg) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: `Invalid dietary type "${rawVegType}". Allowed values: veg, nonveg, vegan, na`,
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

        if (shortDesc && shortDesc.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Short description cannot exceed 500 characters",
          });
          continue;
        }

        if (itemImage && itemImage.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: dataSheetName,
            status: "rejected",
            name: varName,
            reason: "Item image URL cannot exceed 500 characters",
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
        if (isNaN(priceNum) || priceNum <= 0) {
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
          if (isNaN(sNum) || sNum < 0 || !Number.isInteger(sNum)) {
            rejected.push({
              row: rowNum,
              sheet: dataSheetName,
              status: "rejected",
              name: varSkuUpper,
              reason: "Stock quantity must be an integer greater than or equal to 0",
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
            reason: `Duplicate measurement ${unitValNum}${unit} for item "${varName}" under product "${pSkuUpper}"`,
          });
          continue;
        }

        sheetSeenVariantSkus.add(varSkuUpper);
        sheetSeenVariantCodes.add(finalItemCode);
        usedVarSlugs.add(finalItemCode);
        sheetSeenVarUnitValue.add(unitValKey);

        validVars.push({
          productSku: pSkuUpper,
          variantName: varName,
          variantCode: finalItemCode,
          unit,
          unitValue: unitValNum,
          variantSku: varSkuUpper,
          price: priceNum,
          stockQty,
          reorderLevel,
          isDefault,
          vegType: parsedVeg,
          shelfLife: shelfLife || undefined,
          isFeatured,
          isReadyToMix,
          cookingRecipe: cookingRecipe || undefined,
          shortDescription: shortDesc || undefined,
          description: itemDesc || undefined,
          ingredients: ingredients || undefined,
          itemImage: itemImage || undefined,
          outOfStock,
          isActive,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BRANCH B: MULTI-SHEET FORMAT (Categories, Products, Variants)
    // ─────────────────────────────────────────────────────────────────────────
    else {
      const rawCats = parseSheet<RawCategoryRow>("Categories");
      const rawProds = parseSheet<RawProductRow>("Products");
      const rawVars = parseSheet<RawVariantRow>(
        sheetNames.includes("Variants") ? "Variants" : "Items"
      );
      totalRows = rawCats.length + rawProds.length + rawVars.length;

      // 1. Validate Categories Sheet
      for (let i = 0; i < rawCats.length; i++) {
        const row = rawCats[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const name = safeStr(row.category_name || row.category);
        let code = safeStr(row.category_code || row.category_slug || row.slug);
        const parentName = safeStr(row.parent_category);
        const desc = safeStr(row.category_description || row.description);
        const icon = safeStr(row.category_image || row.image || row.icon);
        const rawSort = row.category_sort_order ?? row.sort_order;

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

        if (code) {
          if (!/^[A-Za-z0-9_]+$/.test(code)) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: `Category code "${code}" can only contain letters, numbers, and underscores`,
            });
            continue;
          }
          if (code.length > 170) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: "Category code cannot exceed 170 characters",
            });
            continue;
          }
        } else {
          code = makeUniqueCode(name, usedCatSlugs, 170);
        }

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

        if (icon && icon.length > 500) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: "Category image path cannot exceed 500 characters",
          });
          continue;
        }

        let sortOrder = validCats.length + 1;
        if (rawSort != null && rawSort !== "") {
          const sNum = parseFloat(String(rawSort));
          if (isNaN(sNum) || !Number.isInteger(sNum) || sNum < 0 || sNum > 100) {
            rejected.push({
              row: rowNum,
              sheet: "Categories",
              status: "rejected",
              name,
              reason: "Sort order must be an integer between 0 and 100",
            });
            continue;
          }
          sortOrder = sNum;
        }

        if (categoryMap.has(name.toLowerCase())) {
          continue;
        }

        if (sheetSeenCatNames.has(name.toLowerCase())) {
          rejected.push({
            row: rowNum,
            sheet: "Categories",
            status: "rejected",
            name,
            reason: `Duplicate category name "${name}" in sheet`,
          });
          continue;
        }

        sheetSeenCatNames.add(name.toLowerCase());
        sheetSeenCatCodes.add(code.toUpperCase());
        usedCatSlugs.add(code.toUpperCase());

        validCats.push({
          name,
          slug: code.toUpperCase(),
          parentName: parentName || undefined,
          description: desc || undefined,
          icon: icon || undefined,
          sortOrder,
        });
      }

      // 2. Validate Products Sheet
      for (let i = 0; i < rawProds.length; i++) {
        const row = rawProds[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const name = safeStr(row.product_name || row.name);
        const sku = safeStr(row.product_sku || row.sku);
        let code = safeStr(row.product_code || row.product_slug || row.slug);
        const categoryName = safeStr(row.category_name || row.category);
        const brand = safeStr(row.brand || row.brand_name);
        const hsn = safeStr(row.hsn_code || row.hsn);
        const desc = safeStr(row.product_description || row.description);
        const pImage = safeStr(row.product_image || row.image_url);

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

        if (code) {
          code = code.toUpperCase().replace(/\s+/g, "_");
          if (code.length > 220) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name,
              reason: "Product code cannot exceed 220 characters",
            });
            continue;
          }
          if (usedProdSlugs.has(code)) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name,
              reason: `Product code "${code}" already exists in database`,
            });
            continue;
          }
        } else {
          code = makeUniqueCode(skuUpper.replace(/[^A-Z0-9_]/g, "_"), usedProdSlugs, 220);
        }

        let brandId: bigint | undefined = defaultBrandId;
        let matchedBrandName: string | undefined = defaultBrandName;
        if (brand) {
          if (brand.length > 150) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name,
              reason: "Brand name cannot exceed 150 characters",
            });
            continue;
          }
          const foundId = brandMap.get(brand.toLowerCase());
          if (foundId) {
            brandId = foundId;
            matchedBrandName = brand;
          } else {
            matchedBrandName = brand;
            brandId = defaultBrandId;
          }
        }

        let hsnCodeId: bigint | undefined;
        let matchedHsnCode: string | undefined;
        if (hsn) {
          if (hsn.length > 20) {
            rejected.push({
              row: rowNum,
              sheet: "Products",
              status: "rejected",
              name,
              reason: "HSN code cannot exceed 20 characters",
            });
            continue;
          }
          const foundHsn = hsnMap.get(hsn.toLowerCase());
          if (foundHsn) {
            hsnCodeId = foundHsn;
            matchedHsnCode = hsn;
          } else {
            matchedHsnCode = hsn;
            hsnCodeId = undefined;
          }
        }

        let basePrice = 0;
        const rawP = row.base_price != null && row.base_price !== "" ? row.base_price : row.price;
        if (rawP != null && rawP !== "") {
          const pNum = parseFloat(String(rawP));
          if (!isNaN(pNum) && pNum >= 0) {
            basePrice = pNum;
          }
        }

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
        sheetSeenProductCodes.add(code);
        usedProdSlugs.add(code);

        validProds.push({
          sku: skuUpper,
          name,
          slug: code,
          categoryName,
          basePrice,
          salePrice:
            row.sale_price != null && row.sale_price !== "" && !isNaN(parseFloat(String(row.sale_price)))
              ? parseFloat(String(row.sale_price))
              : undefined,
          description: desc || undefined,
          brandName: matchedBrandName,
          brandId,
          hsnCode: matchedHsnCode,
          hsnCodeId,
          productImage: pImage || undefined,
        });
      }

      // 3. Validate Variants Sheet
      for (let i = 0; i < rawVars.length; i++) {
        const row = rawVars[i];
        const rowNum = i + 2;
        if (isRowEmpty(row as Record<string, unknown>)) continue;

        const productSku = safeStr(row.product_sku || row.sku).toUpperCase();
        const variantName = safeStr(row.item_name || row.variant_name || row.name);
        let variantCode = safeStr(row.item_code || row.variant_code || row.variant_slug || row.slug);
        const rawVegType = safeStr(row.veg_type || row.dietary_type);
        const shelfLife = safeStr(row.shelf_life || row.best_before);
        const isFeatured = safeBool(row.is_featured ?? row.featured, false);
        const isReadyToMix = safeBool(row.is_ready_to_mix ?? row.ready_to_mix, false);
        const cookingRecipe = safeStr(row.cooking_recipe || row.recipe);
        const shortDescription = safeStr(row.short_description);
        const description = safeStr(row.item_description || row.variant_description || row.description);
        const ingredients = safeStr(row.ingredients);
        const itemImage = safeStr(row.item_image || row.variant_image);
        const outOfStock = safeBool(row.out_of_stock, false);
        const isActive = safeBool(row.is_active, true);

        const unit = safeStr(row.unit || row.unit_code).toLowerCase();
        const rawUnitVal = row.unit_value ?? row.pack_size;
        const variantSku = safeStr(row.variant_sku || row.pack_sku).toUpperCase();
        const rawPrice = row.price != null && row.price !== "" ? row.price : row.base_price;
        const rawStock = row.stock_qty != null && row.stock_qty !== "" ? row.stock_qty : row.stock;
        const rawReorder = row.reorder_level;
        const isDefault = safeBool(row.is_default, false);

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

        if (variantCode) {
          variantCode = variantCode.toUpperCase().replace(/\s+/g, "_");
          if (variantCode.length > 255) {
            rejected.push({
              row: rowNum,
              sheet: "Variants",
              status: "rejected",
              name: variantName,
              reason: "Variant code cannot exceed 255 characters",
            });
            continue;
          }
        } else {
          variantCode = makeUniqueCode(
            `${productSku}_${slugify(variantName).replace(/-/g, "_").toUpperCase()}`,
            usedVarSlugs,
            250
          );
        }

        const parsedVeg = parseVegType(rawVegType);
        if (!parsedVeg) {
          rejected.push({
            row: rowNum,
            sheet: "Variants",
            status: "rejected",
            name: variantName,
            reason: `Invalid dietary type "${rawVegType}". Allowed values: veg, nonveg, vegan, na`,
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
          if (!isNaN(rNum) && rNum >= 0 && Number.isInteger(rNum)) {
            reorderLevel = rNum;
          }
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
        sheetSeenVariantCodes.add(variantCode);
        usedVarSlugs.add(variantCode);
        sheetSeenVarUnitValue.add(unitValKey);

        validVars.push({
          productSku,
          variantName,
          variantCode,
          unit,
          unitValue: unitValNum,
          variantSku,
          price: priceNum,
          stockQty,
          reorderLevel,
          isDefault,
          vegType: parsedVeg,
          shelfLife: shelfLife || undefined,
          isFeatured,
          isReadyToMix,
          cookingRecipe: cookingRecipe || undefined,
          shortDescription: shortDescription || undefined,
          description: description || undefined,
          ingredients: ingredients || undefined,
          itemImage: itemImage || undefined,
          outOfStock,
          isActive,
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
        productCode: prod.slug,
        sku: prod.sku,
        brand: prod.brandName,
        variants: vars.map((v) => ({
          variantName: v.variantName,
          variantCode: v.variantCode,
          vegType: v.vegType,
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
        const createdCat = await tx.productCategory.create({
          data: {
            uuid: crypto.randomUUID(),
            name: cat.name,
            slug: cat.slug,
            description: cat.description ?? null,
            icon: cat.icon ?? null,
            parentId: parentId ?? null,
            sortOrder: cat.sortOrder,
            isActive: true,
            status: true,
            created_by: adminUserId ?? null,
            updated_by: adminUserId ?? null,
          },
        });
        categoryMap.set(cat.name.toLowerCase(), createdCat.id);
        categoryMap.set(cat.slug.toLowerCase(), createdCat.id);

        if (cat.icon) {
          await tx.product_category_images.create({
            data: {
              uuid: crypto.randomUUID(),
              category_id: createdCat.id,
              image_url: cat.icon,
              sort_order: 0,
              is_active: true,
              status: true,
              created_by: adminUserId ?? null,
              updated_by: adminUserId ?? null,
            },
          });
        }
        importedCategories.push(cat.name);
      }

      // 6b. Insert products + variants
      for (const prod of validProds) {
        const catId = categoryMap.get(prod.categoryName.toLowerCase());
        const resolvedBrandId =
          prod.brandId ?? (prod.brandName ? brandMap.get(prod.brandName.toLowerCase()) : null);
        const resolvedHsnId =
          prod.hsnCodeId ?? (prod.hsnCode ? hsnMap.get(prod.hsnCode.toLowerCase()) : null);

        const createdProd = await tx.product.create({
          data: {
            uuid: crypto.randomUUID(),
            name: prod.name,
            slug: prod.slug,
            sku: prod.sku,
            base_price: prod.basePrice,
            sale_price: prod.salePrice ?? null,
            categoryId: catId ? catId : null,
            brandId: resolvedBrandId ?? null,
            hsn_code_id: resolvedHsnId ?? null,
            isActive: true,
            status: true,
            created_by: adminUserId ?? null,
            updated_by: adminUserId ?? null,
          },
        });
        importedProducts.push(prod.name);

        if (prod.productImage) {
          await tx.productImage.create({
            data: {
              productId: createdProd.id,
              image_url: prod.productImage,
              isPrimary: true,
              sortOrder: 0,
              is_active: true,
              created_by: adminUserId ?? null,
              updated_by: adminUserId ?? null,
            },
          });
        }

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
              slug: first.variantCode,
              is_default: isVariantDefault,
              isActive: first.isActive,
              out_of_stock: first.outOfStock,
              is_featured: first.isFeatured,
              is_ready_to_mix: first.isReadyToMix,
              cooking_recipe: first.cookingRecipe ?? null,
              shelf_life: first.shelfLife ?? null,
              short_description: first.shortDescription ?? null,
              description: first.description ?? null,
              ingredients: first.ingredients ?? null,
              veg_type: first.vegType,
              created_by: adminUserId ?? null,
              updated_by: adminUserId ?? null,
            },
          });

          if (first.itemImage) {
            await tx.product_variant_images.create({
              data: {
                uuid: crypto.randomUUID(),
                variant_id: createdVariant.id,
                image_url: first.itemImage,
                is_primary: true,
                sort_order: 0,
                is_active: true,
                status: true,
                created_by: adminUserId ?? null,
                updated_by: adminUserId ?? null,
              },
            });
          }

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
                isActive: sv.isActive,
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
