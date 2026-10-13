import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/import/template
 * Returns a ready-to-fill Single Unified Excel template with sample catalog rows and instructions for Rithu Snacks.
 */
export async function GET() {
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Catalog Import (Single Unified Sheet) ───
  const catalogHeaders = [
    // Category Fields (Create Category)
    "category_name",
    "category_code",
    "category_description",
    "category_image",
    "category_sort_order",

    // Product Fields (Create Product)
    "product_name",
    "product_code",
    "product_sku",
    "brand",
    "hsn_code",
    "product_description",
    "product_image",

    // Item / Variant Fields (Create Item)
    "item_name",
    "item_code",
    "veg_type",
    "shelf_life",
    "is_featured",
    "is_ready_to_mix",
    "cooking_recipe",
    "short_description",
    "item_description",
    "ingredients",
    "item_image",

    // Units & Pricing Fields (Units & Pricing)
    "unit_value",
    "unit",
    "variant_sku",
    "price",
    "stock_qty",
    "reorder_level",
    "is_default",
  ];

  const sampleRows = [
    // 1. Traditional Kai Murukku: Standard Pouch (200g)
    [
      "Traditional Snacks > Murukku",
      "TRAD_MURUKKU",
      "Authentic South Indian handmade murukku and savoury crunchy snacks",
      "",
      1,
      "Traditional Kai Murukku",
      "TRAD_MUR_KAI_001",
      "RS-MUR-001",
      "Rithu Snacks",
      "1905",
      "Authentic handmade crispy rice & urad dal murukku seasoned with cumin and sesame",
      "",
      "Standard Pouch",
      "MUR_KAI_STD_POUCH",
      "veg",
      "60 Days",
      "YES",
      "NO",
      "",
      "Handmade crispy golden murukku pouch",
      "Crafted using our heritage grandmother recipe with pure butter and premium rice flour.",
      "Rice flour, urad dal flour, butter, cumin seeds, sesame seeds, asafoetida, salt, groundnut oil",
      "",
      200,
      "g",
      "RS-MUR-P200",
      90,
      150,
      20,
      "YES",
    ],
    // 2. Traditional Kai Murukku: Standard Pouch (400g) - Multi-size inheritance
    [
      "Traditional Snacks > Murukku",
      "TRAD_MURUKKU",
      "Authentic South Indian handmade murukku and savoury crunchy snacks",
      "",
      1,
      "Traditional Kai Murukku",
      "TRAD_MUR_KAI_001",
      "RS-MUR-001",
      "Rithu Snacks",
      "1905",
      "Authentic handmade crispy rice & urad dal murukku seasoned with cumin and sesame",
      "",
      "Standard Pouch",
      "MUR_KAI_STD_POUCH",
      "veg",
      "60 Days",
      "YES",
      "NO",
      "",
      "Handmade crispy golden murukku pouch",
      "Crafted using our heritage grandmother recipe with pure butter and premium rice flour.",
      "Rice flour, urad dal flour, butter, cumin seeds, sesame seeds, asafoetida, salt, groundnut oil",
      "",
      400,
      "g",
      "RS-MUR-P400",
      175,
      100,
      15,
      "NO",
    ],
    // 3. Traditional Kai Murukku: Gift Box (500g) - Second packaging variant
    [
      "Traditional Snacks > Murukku",
      "TRAD_MURUKKU",
      "Authentic South Indian handmade murukku and savoury crunchy snacks",
      "",
      1,
      "Traditional Kai Murukku",
      "TRAD_MUR_KAI_001",
      "RS-MUR-001",
      "Rithu Snacks",
      "1905",
      "Authentic handmade crispy rice & urad dal murukku seasoned with cumin and sesame",
      "",
      "Gift Box",
      "MUR_KAI_GIFT_BOX",
      "veg",
      "60 Days",
      "YES",
      "NO",
      "",
      "Festive premium gift box pack",
      "Handpicked intact kai murukku packaged in airtight festive rigid boxes.",
      "Rice flour, urad dal flour, butter, cumin seeds, sesame seeds, asafoetida, salt, groundnut oil",
      "",
      500,
      "g",
      "RS-MUR-B500",
      240,
      60,
      10,
      "NO",
    ],

    // 4. Special Madras Mixture: Standard Pouch (250g)
    [
      "Traditional Snacks > Pakoda & Mixture",
      "TRAD_MIXTURE",
      "Crisp mixtures, ribbon pakoda, and crunchy savouries",
      "",
      2,
      "Special Madras Mixture",
      "TRAD_MIX_MADRAS_002",
      "RS-MIX-002",
      "Rithu Snacks",
      "1905",
      "Crunchy savoury mixture loaded with fried peanuts, cashews, boondi, and fresh curry leaves",
      "",
      "Standard Pouch",
      "MIX_MADRAS_STD_POUCH",
      "veg",
      "45 Days",
      "YES",
      "NO",
      "",
      "Authentic spicy Madras style mixture",
      "Classic spicy snack with roasted nuts, sev, boondi and aromatic spices.",
      "Gram flour, rice flour, peanuts, cashew nuts, roasted gram, curry leaves, chili powder, salt, oil",
      "",
      250,
      "g",
      "RS-MIX-P250",
      110,
      180,
      25,
      "YES",
    ],
    // 5. Special Madras Mixture: Standard Pouch (500g)
    [
      "Traditional Snacks > Pakoda & Mixture",
      "TRAD_MIXTURE",
      "Crisp mixtures, ribbon pakoda, and crunchy savouries",
      "",
      2,
      "Special Madras Mixture",
      "TRAD_MIX_MADRAS_002",
      "RS-MIX-002",
      "Rithu Snacks",
      "1905",
      "Crunchy savoury mixture loaded with fried peanuts, cashews, boondi, and fresh curry leaves",
      "",
      "Standard Pouch",
      "MIX_MADRAS_STD_POUCH",
      "veg",
      "45 Days",
      "YES",
      "NO",
      "",
      "Authentic spicy Madras style mixture",
      "Classic spicy snack with roasted nuts, sev, boondi and aromatic spices.",
      "Gram flour, rice flour, peanuts, cashew nuts, roasted gram, curry leaves, chili powder, salt, oil",
      "",
      500,
      "g",
      "RS-MIX-P500",
      210,
      120,
      20,
      "NO",
    ],

    // 6. Maa Laddu: Traditional Sweets (250g)
    [
      "Traditional Sweets",
      "TRAD_SWEETS",
      "Melt-in-mouth traditional South Indian sweets made with pure ghee",
      "",
      3,
      "Maa Laddu (Roasted Gram Laddu)",
      "TRAD_LAD_MAA_004",
      "RS-LAD-004",
      "Rithu Snacks",
      "1704",
      "Traditional ghee roasted gram flour laddu with fragrant green cardamom and cashews",
      "",
      "Standard Box",
      "LAD_MAA_STD_BOX",
      "veg",
      "30 Days",
      "YES",
      "NO",
      "",
      "Rich roasted gram flour laddu",
      "Nutritious and aromatic laddus sweetened with sugar and bound in pure cow ghee.",
      "Roasted gram dal (pottukadali), cane sugar, pure cow ghee, cashew nuts, cardamom",
      "",
      250,
      "g",
      "RS-LAD-B250",
      140,
      80,
      15,
      "YES",
    ],

    // 7. Pure Ghee Mysore Pak: Royal Box (250g)
    [
      "Traditional Sweets",
      "TRAD_SWEETS",
      "Melt-in-mouth traditional South Indian sweets made with pure ghee",
      "",
      3,
      "Pure Ghee Mysore Pak",
      "TRAD_MYS_PAK_005",
      "RS-MYS-005",
      "Rithu Snacks",
      "1704",
      "Rich melt-in-mouth South Indian delicacy crafted with pure cow ghee and roasted besan",
      "",
      "Royal Box",
      "MYS_PAK_ROYAL_BOX",
      "veg",
      "25 Days",
      "YES",
      "NO",
      "",
      "Pure ghee melt-in-mouth Mysore Pak",
      "Velvety soft Mysore Pak made with pure cow ghee, gram flour, and cardamom.",
      "Pure cow ghee, gram flour (besan), sugar, cardamom",
      "",
      250,
      "g",
      "RS-MYS-B250",
      180,
      60,
      10,
      "YES",
    ],

    // 8. Instant Murukku Mix Flour: Ready to Mix (500g) - Demonstrates is_ready_to_mix & cooking_recipe
    [
      "Ready to Mix",
      "READY_TO_MIX",
      "Convenient traditional premixes and instant snack flours",
      "",
      4,
      "Instant Kai Murukku Premix",
      "RTM_MUR_FLOUR_007",
      "RS-RTM-007",
      "Rithu Snacks",
      "1905",
      "Instant premix flour to make authentic crispy kai murukku at home in minutes",
      "",
      "Premix Pouch",
      "RTM_MUR_PREMIX_POUCH",
      "veg",
      "180 Days",
      "NO",
      "YES",
      "Add 1.5 cups of warm water and 2 tbsp softened butter to 500g premix. Knead into a soft dough. Press using murukku press into medium-hot oil and fry until golden crisp.",
      "Quick homemade murukku flour premix",
      "All-in-one premix containing roasted rice and urad dal flour with seasoning.",
      "Raw rice flour, roasted urad dal flour, cumin seeds, sesame seeds, asafoetida, salt",
      "",
      500,
      "g",
      "RS-RTM-P500",
      130,
      75,
      15,
      "YES",
    ],

    // 9. Kerala Nendran Banana Chips: 200g
    [
      "Chips & Crisps",
      "CHIPS_CRISPS",
      "Authentic coconut oil fried chips and plantain crisps",
      "",
      5,
      "Kerala Nendran Banana Chips",
      "CHP_NENDRAN_006",
      "RS-CHP-006",
      "Rithu Snacks",
      "2008",
      "Thinly sliced golden raw Nendran plantains fried crisp in pure coconut oil",
      "",
      "Standard Pouch",
      "CHP_NENDRAN_STD_POUCH",
      "vegan",
      "60 Days",
      "YES",
      "NO",
      "",
      "Pure coconut oil fried banana chips",
      "Made with prime Grade-A Wayanad Nendran bananas and cold-pressed coconut oil.",
      "Raw Nendran bananas, pure cold pressed coconut oil, turmeric, salt",
      "",
      200,
      "g",
      "RS-CHP-P200",
      95,
      160,
      20,
      "YES",
    ],
    // 10. Kerala Nendran Banana Chips: 400g
    [
      "Chips & Crisps",
      "CHIPS_CRISPS",
      "Authentic coconut oil fried chips and plantain crisps",
      "",
      5,
      "Kerala Nendran Banana Chips",
      "CHP_NENDRAN_006",
      "RS-CHP-006",
      "Rithu Snacks",
      "2008",
      "Thinly sliced golden raw Nendran plantains fried crisp in pure coconut oil",
      "",
      "Standard Pouch",
      "CHP_NENDRAN_STD_POUCH",
      "vegan",
      "60 Days",
      "YES",
      "NO",
      "",
      "Pure coconut oil fried banana chips",
      "Made with prime Grade-A Wayanad Nendran bananas and cold-pressed coconut oil.",
      "Raw Nendran bananas, pure cold pressed coconut oil, turmeric, salt",
      "",
      400,
      "g",
      "RS-CHP-P400",
      185,
      110,
      15,
      "NO",
    ],
  ];

  const wsCatalog = XLSX.utils.aoa_to_sheet([catalogHeaders, ...sampleRows]);
  wsCatalog["!cols"] = [
    // Category Columns
    { wch: 32 }, // category_name
    { wch: 18 }, // category_code
    { wch: 36 }, // category_description
    { wch: 22 }, // category_image
    { wch: 20 }, // category_sort_order

    // Product Columns
    { wch: 30 }, // product_name
    { wch: 22 }, // product_code
    { wch: 16 }, // product_sku
    { wch: 16 }, // brand
    { wch: 12 }, // hsn_code
    { wch: 45 }, // product_description
    { wch: 22 }, // product_image

    // Item / Variant Columns
    { wch: 24 }, // item_name
    { wch: 24 }, // item_code
    { wch: 12 }, // veg_type
    { wch: 14 }, // shelf_life
    { wch: 12 }, // is_featured
    { wch: 15 }, // is_ready_to_mix
    { wch: 45 }, // cooking_recipe
    { wch: 35 }, // short_description
    { wch: 45 }, // item_description
    { wch: 45 }, // ingredients
    { wch: 22 }, // item_image

    // Units & Pricing Columns
    { wch: 12 }, // unit_value
    { wch: 8 },  // unit
    { wch: 18 }, // variant_sku
    { wch: 10 }, // price
    { wch: 12 }, // stock_qty
    { wch: 14 }, // reorder_level
    { wch: 12 }, // is_default
  ];
  XLSX.utils.book_append_sheet(wb, wsCatalog, "Catalog Import");

  // ─── Sheet 2: Instructions & Reference ───
  const instructionData = [
    ["RITHU SNACKS – Complete Catalog Bulk Import Template"],
    [""],
    ["1. COLUMN SPECIFICATION & VALIDATION RULES"],
    [""],
    ["[CATEGORY FIELDS] (Matched with Create Category Form)"],
    ["• category_name        [REQUIRED]  Name of the category. Use '>' to create a hierarchy (e.g. 'Traditional Snacks > Murukku'). Max 150 chars."],
    ["• category_code        [REQUIRED]  Unique category code. Letters, numbers, and underscores only (e.g. TRAD_SNACKS). Max 170 chars."],
    ["• category_description [OPTIONAL]  Brief description of the category. Max 2000 chars."],
    ["• category_image       [OPTIONAL]  URL or relative path to the category image/icon. Max 500 chars."],
    ["• category_sort_order  [OPTIONAL]  Display ordering number (0 to 100). Default is 0."],
    [""],
    ["[PRODUCT FIELDS] (Matched with Create Product Form)"],
    ["• product_name         [REQUIRED]  Full name of the product. Max 200 chars."],
    ["• product_code         [REQUIRED]  Product code. Letters, numbers, underscores and hyphens allowed (e.g. TRAD_MUR_KAI_001). Max 220 chars."],
    ["• product_sku          [REQUIRED]  Unique product catalog SKU code (e.g. RS-MUR-001). Must be unique across all products. Max 100 chars."],
    ["• brand                 [OPTIONAL]  Brand name (e.g. 'Rithu Snacks'). Must exist in active Brands in admin dashboard. Defaults to active brand if empty."],
    ["• hsn_code             [OPTIONAL]  Harmonized System Nomenclature code for GST (e.g. 1905 for snacks, 1704 for sweets, 2008 for chips). Max 50 chars."],
    ["• product_description  [OPTIONAL]  General description of the product. Max 2000 chars."],
    ["• product_image        [OPTIONAL]  URL or path to primary product image. Max 500 chars."],
    [""],
    ["[ITEM / VARIANT FIELDS] (Matched with Create Item Form)"],
    ["• item_name            [REQUIRED]  Name of the item / packaging variant (e.g. 'Standard Pouch', 'Gift Box', 'Royal Box'). Max 100 chars."],
    ["• item_code            [REQUIRED]  Internal code for this item (e.g. MUR_KAI_STD_POUCH). Max 255 chars."],
    ["• veg_type             [REQUIRED]  Dietary classification. Allowed values: 'veg', 'nonveg', 'vegan', 'na' (case-insensitive). Defaults to 'veg'."],
    ["• shelf_life           [OPTIONAL]  Best before duration / shelf life (e.g. '60 Days', '90 Days', '6 Months'). Max 100 chars."],
    ["• is_featured          [OPTIONAL]  'YES' to display prominently in storefront featured lists, otherwise 'NO'. Default: NO."],
    ["• is_ready_to_mix      [OPTIONAL]  'YES' if this item requires cooking/mixing before eating (e.g. instant flour premixes), otherwise 'NO'. Default: NO."],
    ["• cooking_recipe       [OPTIONAL]  Step-by-step preparation and cooking instructions for ready-to-mix items."],
    ["• short_description   [OPTIONAL]  Brief 1-2 sentence overview of the item. Max 500 chars."],
    ["• item_description    [OPTIONAL]  Detailed information, serving suggestions, or history of this specific item."],
    ["• ingredients          [OPTIONAL]  Comma-separated list of ingredients."],
    ["• item_image           [OPTIONAL]  URL or path to item packaging photo. Max 500 chars."],
    [""],
    ["[UNITS & PRICING FIELDS] (Matched with Units & Pricing Form)"],
    ["• unit_value           [REQUIRED]  Measurement quantity / pack size. Number greater than 0 (e.g. 200, 250, 400, 500)."],
    ["• unit                 [REQUIRED]  Measurement unit code. Must match an active unit: 'g', 'kg', 'ml', 'L', 'pcs', 'pkt', 'box'."],
    ["• variant_sku          [REQUIRED]  Unique SKU code for this specific pack size (e.g. RS-MUR-P200). Must be unique across all packs. Max 100 chars."],
    ["• price                [REQUIRED]  Price per pack in Rupees (₹). Must be greater than 0."],
    ["• stock_qty            [OPTIONAL]  Initial available stock quantity in inventory. Integer >= 0. Default: 0."],
    ["• reorder_level        [OPTIONAL]  Low stock alert threshold. Integer >= 0. Default: 10."],
    ["• is_default           [OPTIONAL]  'YES' for the primary pack size shown first to customers on the store, otherwise 'NO'."],
    [""],
    ["2. MULTI-SIZE PACKAGING & INHERITANCE RULES"],
    ["• To sell the same product in multiple pack sizes (e.g. 200g, 400g, 500g):"],
    ["  Repeat the 'product_sku' and 'item_name' on subsequent rows, and change 'unit_value', 'variant_sku', 'price', and 'stock_qty'."],
    ["  If you leave product details (name, category, description) or item details blank on subsequent rows of the same item,"],
    ["  they are automatically inherited from the row above!"],
    [""],
    ["3. VALID UNIT CODES IN DATABASE"],
    ["• g   -> Grams (e.g. 100, 200, 250, 400, 500)"],
    ["• kg  -> Kilograms (e.g. 1, 2, 5)"],
    ["• ml  -> Milliliters (e.g. 250, 500)"],
    ["• L   -> Liters (e.g. 1, 2)"],
    ["• pcs -> Pieces"],
    ["• pkt -> Packets"],
    ["• box -> Boxes"],
    [""],
    ["4. BACKWARD COMPATIBILITY"],
    ["• Legacy column names ('category', 'variant_name', 'sku', 'base_price', 'stock') are still accepted seamlessly."],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionData);
  wsInstructions["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  const xlBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(xlBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="rithu_snacks_catalog_import_template.xlsx"',
    },
  });
}

