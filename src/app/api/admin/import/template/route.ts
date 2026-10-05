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
    "category",
    "product_name",
    "product_sku",
    "product_description",
    "variant_name",
    "unit_value",
    "unit",
    "variant_sku",
    "price",
    "stock_qty",
    "reorder_level",
    "is_default",
    "hsn_code",
  ];

  const sampleRows = [
    // Kai Murukku: 2 Variants (Standard Pouch & Gift Box), multiple sizes
    [
      "Traditional Snacks > Murukku",
      "Traditional Kai Murukku",
      "RS-MUR-001",
      "Authentic handmade crispy rice & urad dal murukku",
      "Standard Pouch",
      200,
      "g",
      "RS-MUR-P200",
      90,
      150,
      20,
      "YES",
      "1905",
    ],
    [
      "Traditional Snacks > Murukku",
      "Traditional Kai Murukku",
      "RS-MUR-001",
      "Authentic handmade crispy rice & urad dal murukku",
      "Standard Pouch",
      400,
      "g",
      "RS-MUR-P400",
      175,
      100,
      15,
      "NO",
      "1905",
    ],
    [
      "Traditional Snacks > Murukku",
      "Traditional Kai Murukku",
      "RS-MUR-001",
      "Authentic handmade crispy rice & urad dal murukku",
      "Gift Box",
      500,
      "g",
      "RS-MUR-B500",
      240,
      60,
      10,
      "NO",
      "1905",
    ],

    // Special Madras Mixture: Standard Pouch with 2 sizes
    [
      "Traditional Snacks > Pakoda & Mixture",
      "Special Madras Mixture",
      "RS-MIX-002",
      "Crunchy savoury mixture with peanuts, cashews, and curry leaves",
      "Standard Pouch",
      250,
      "g",
      "RS-MIX-P250",
      110,
      180,
      25,
      "YES",
      "1905",
    ],
    [
      "Traditional Snacks > Pakoda & Mixture",
      "Special Madras Mixture",
      "RS-MIX-002",
      "Crunchy savoury mixture with peanuts, cashews, and curry leaves",
      "Standard Pouch",
      500,
      "g",
      "RS-MIX-P500",
      210,
      120,
      20,
      "NO",
      "1905",
    ],

    // Ribbon Pakoda: 2 sizes
    [
      "Traditional Snacks > Pakoda & Mixture",
      "Ribbon Pakoda (Nada)",
      "RS-PAK-003",
      "Melt-in-mouth crisp ribbon pakoda spiced with mild chilli",
      "Crispy Pouch",
      200,
      "g",
      "RS-PAK-P200",
      85,
      140,
      20,
      "YES",
      "1905",
    ],
    [
      "Traditional Snacks > Pakoda & Mixture",
      "Ribbon Pakoda (Nada)",
      "RS-PAK-003",
      "Melt-in-mouth crisp ribbon pakoda spiced with mild chilli",
      "Crispy Pouch",
      400,
      "g",
      "RS-PAK-P400",
      165,
      90,
      15,
      "NO",
      "1905",
    ],

    // Maa Laddu: Sweets
    [
      "Traditional Sweets",
      "Maa Laddu (Roasted Gram Laddu)",
      "RS-LAD-004",
      "Traditional ghee roasted gram flour laddu with cardamom",
      "Standard Box",
      250,
      "g",
      "RS-LAD-B250",
      140,
      80,
      15,
      "YES",
      "1704",
    ],
    [
      "Traditional Sweets",
      "Maa Laddu (Roasted Gram Laddu)",
      "RS-LAD-004",
      "Traditional ghee roasted gram flour laddu with cardamom",
      "Standard Box",
      500,
      "g",
      "RS-LAD-B500",
      270,
      50,
      10,
      "NO",
      "1704",
    ],

    // Mysore Pak: Pure Ghee
    [
      "Traditional Sweets",
      "Pure Ghee Mysore Pak",
      "RS-MYS-005",
      "Rich melt-in-mouth traditional South Indian delicacy made with pure ghee",
      "Royal Box",
      250,
      "g",
      "RS-MYS-B250",
      180,
      60,
      10,
      "YES",
      "1704",
    ],
    [
      "Traditional Sweets",
      "Pure Ghee Mysore Pak",
      "RS-MYS-005",
      "Rich melt-in-mouth traditional South Indian delicacy made with pure ghee",
      "Royal Box",
      500,
      "g",
      "RS-MYS-B500",
      350,
      40,
      8,
      "NO",
      "1704",
    ],

    // Nendran Banana Chips: 2 sizes
    [
      "Chips & Crisps",
      "Kerala Nendran Banana Chips",
      "RS-CHP-006",
      "Thinly sliced golden Nendran plantains fried in coconut oil",
      "Standard Pouch",
      200,
      "g",
      "RS-CHP-P200",
      95,
      160,
      20,
      "YES",
      "2008",
    ],
    [
      "Chips & Crisps",
      "Kerala Nendran Banana Chips",
      "RS-CHP-006",
      "Thinly sliced golden Nendran plantains fried in coconut oil",
      "Standard Pouch",
      400,
      "g",
      "RS-CHP-P400",
      185,
      110,
      15,
      "NO",
      "2008",
    ],
  ];

  const wsCatalog = XLSX.utils.aoa_to_sheet([catalogHeaders, ...sampleRows]);
  wsCatalog["!cols"] = [
    { wch: 32 }, // category
    { wch: 30 }, // product_name
    { wch: 16 }, // product_sku
    { wch: 45 }, // product_description
    { wch: 22 }, // variant_name
    { wch: 12 }, // unit_value
    { wch: 8 },  // unit
    { wch: 18 }, // variant_sku
    { wch: 10 }, // price
    { wch: 12 }, // stock_qty
    { wch: 14 }, // reorder_level
    { wch: 12 }, // is_default
    { wch: 12 }, // hsn_code
  ];
  XLSX.utils.book_append_sheet(wb, wsCatalog, "Catalog Import");

  // ─── Sheet 2: Instructions & Reference ───
  const instructionData = [
    ["RITHU SNACKS – Unified Bulk Import Template"],
    [""],
    ["1. EVERYTHING IN ONE SHEET"],
    ["• Enter all product, variant, and packaging details directly in the 'Catalog Import' sheet."],
    [""],
    ["2. 3-TIER ARCHITECTURE EXPLAINED"],
    ["• Tier 1 (Product): category, product_name, product_sku, product_description"],
    ["• Tier 2 (Variant): variant_name (packaging style, flavor or grade, e.g. 'Standard Pouch', 'Gift Box', 'Royal Box')"],
    ["• Tier 3 (Subvariant / Size): unit_value, unit, variant_sku, price, stock_qty"],
    [""],
    ["3. HOW TO ENTER MULTIPLE SIZES FOR A PRODUCT"],
    ["• To attach multiple package sizes (e.g. 200g, 400g, 500g) under the SAME product:"],
    ["  Repeat the same 'product_sku' and 'variant_name', and specify different 'unit_value', 'variant_sku', and 'price'."],
    ["  The system will automatically group them under one variant with multiple sellable sizes!"],
    [""],
    ["4. VALID UNIT CODES IN DATABASE"],
    ["• g   -> Grams (e.g. 100, 200, 250, 400, 500)"],
    ["• kg  -> Kilograms (e.g. 1, 2, 5)"],
    ["• ml  -> Milliliters (e.g. 250, 500)"],
    ["• L   -> Liters (e.g. 1, 2)"],
    ["• pcs -> Pieces"],
    ["• pkt -> Packets"],
    ["• box -> Boxes"],
    [""],
    ["5. RULES & BEST PRACTICES"],
    ["• SKUs: 'product_sku' and 'variant_sku' must each be unique across your catalog."],
    ["• is_default: Set 'YES' for the primary sellable size shown first on the storefront."],
    ["• Prices: Must be greater than 0."],
    ["• Subcategories: Use '>' in category (e.g. 'Traditional Snacks > Murukku') to create subcategories automatically."],
    ["• Optional fields: If left empty on subsequent rows of the same product, they are automatically inherited."],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionData);
  wsInstructions["!cols"] = [{ wch: 95 }];
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
