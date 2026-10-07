import * as XLSX from "xlsx";
import { toast } from "@/components/ui/Toast";

export type CellFormat =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "status";

export interface ExportColumn<T = any> {
  header: string;
  key?: string; // Supports dot notation like "customer.name" or "_count.products"
  accessor?: (item: T, index: number) => any;
  format?: CellFormat;
  width?: number; // Custom character width (optional)
}

export interface ExcelMergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface ExportToExcelOptions<T = any> {
  filename: string;
  sheetName?: string;
  data?: T[];
  columns?: ExportColumn<T>[];
  rawRows?: (string | number)[][];
  headerRows?: (string | number)[][];
  merges?: ExcelMergeRange[];
  titleBanner?: {
    title: string;
    subtitle?: string;
  };
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  showToast?: boolean;
}

export interface ExportProductsMatrixOptions {
  filename?: string;
  sheetName?: string;
  products: any[];
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export interface ExportVariantsMatrixOptions {
  filename?: string;
  sheetName?: string;
  variants: any[];
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Safely retrieve a nested value from an object via dot notation.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Clean sheet name according to Excel limits (max 31 chars, no special reserved characters).
 */
function sanitizeSheetName(name: string): string {
  const sanitized = name.replace(/[\\/*?[\]:]/g, "_").trim();
  return sanitized.slice(0, 31) || "Sheet1";
}

/**
 * Sanitize filename and ensure .xlsx extension.
 */
function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[\\/*?[\]:<>|"]/g, "_").trim();
  const timestamp = new Date().toISOString().split("T")[0];
  const baseName = clean.endsWith(".xlsx") ? clean.slice(0, -5) : clean;
  return `${baseName}_${timestamp}.xlsx`;
}

/**
 * Format individual cell values based on data type or explicit format.
 */
export function formatCellValue(value: any, format?: CellFormat): string | number {
  if (value === null || value === undefined) {
    return "";
  }

  if (format === "currency") {
    const num = typeof value === "number" ? value : Number(value);
    return isNaN(num) ? String(value) : `₹${num.toFixed(2)}`;
  }

  if (format === "date") {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return String(value);
  }

  if (format === "datetime") {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })} ${d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    } catch {
      // fallback
    }
    return String(value);
  }

  if (format === "boolean") {
    return value ? "Yes" : "No";
  }

  if (format === "status") {
    return String(value).toUpperCase();
  }

  if (format === "number") {
    const num = Number(value);
    return isNaN(num) ? String(value) : num;
  }

  // Automatic type detection
  if (value instanceof Date) {
    return value.toLocaleDateString("en-IN");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  // Check if string looks like an ISO date
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })} ${d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    } catch {
      // fallback
    }
  }

  return String(value);
}

/**
 * Automatically calculates optimal column widths based on all grid rows (headers and data).
 */
export function calculateAoaColumnWidths(aoa: (string | number)[][]): { wch: number }[] {
  if (!aoa || aoa.length === 0) return [];
  const colCount = Math.max(...aoa.map((row) => row.length));
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = 0;
    for (let r = 0; r < aoa.length; r++) {
      const cellVal = aoa[r]?.[c];
      if (cellVal !== null && cellVal !== undefined) {
        const str = String(cellVal).trim();
        // Skip title banner rows that span across the whole sheet to avoid gigantic single-column widths
        if (r <= 1 && str.length > 30 && c === 0) continue;
        if (str.length > maxLen) {
          maxLen = str.length;
        }
      }
    }
    // Set column width between 10 and 50 characters, with 4 chars padding
    widths.push({ wch: Math.min(Math.max(maxLen + 4, 11), 50) });
  }

  return widths;
}

/**
 * Automatically calculates optimal column widths based on headers and data length.
 */
function calculateColumnWidths(headers: string[], rows: (string | number)[][]): { wch: number }[] {
  return headers.map((header, colIndex) => {
    let maxLength = header.length;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cellVal = rows[rowIndex][colIndex];
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : "";
      if (strVal.length > maxLength) {
        maxLength = strVal.length;
      }
    }

    // Add extra padding and limit between 10 and 60 characters
    return { wch: Math.min(Math.max(maxLength + 4, 12), 60) };
  });
}

/**
 * Helper to download a generated XLSX workbook in the browser.
 */
export function downloadWorkbook(
  wb: XLSX.WorkBook,
  filename: string,
  recordCount: number,
  showToast = true,
  onSuccess?: () => void,
  onError?: (err: Error) => void
): boolean {
  try {
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const finalFilename = sanitizeFilename(filename);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    if (showToast) {
      toast.success(
        "Export Successful",
        `Exported ${recordCount} ${recordCount === 1 ? "record" : "records"} to ${finalFilename}`
      );
    }

    onSuccess?.();
    return true;
  } catch (error: any) {
    console.error("Failed to download Excel file:", error);
    if (showToast) {
      toast.error(
        "Export Error",
        error?.message || "An unexpected error occurred while generating the Excel file."
      );
    }
    onError?.(error);
    return false;
  }
}

/**
 * Universal Export to Excel function using XLSX.
 * Supports standard single-header tabular export as well as custom multi-level rows & merges.
 */
export function exportToExcel<T = any>({
  filename,
  sheetName = "Data",
  data,
  columns,
  rawRows,
  headerRows,
  merges,
  titleBanner,
  onSuccess,
  onError,
  showToast = true,
}: ExportToExcelOptions<T>): boolean {
  try {
    // 1. Raw rows mode (for pre-built multi-level or custom spreadsheets)
    if (rawRows && rawRows.length > 0) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rawRows);

      if (merges && merges.length > 0) {
        ws["!merges"] = merges;
      }

      ws["!cols"] = calculateAoaColumnWidths(rawRows);
      const safeSheetName = sanitizeSheetName(sheetName);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

      return downloadWorkbook(
        wb,
        filename,
        data?.length || rawRows.length,
        showToast,
        onSuccess,
        onError
      );
    }

    if (!data || data.length === 0) {
      if (showToast) {
        toast.error("Export Failed", "No data available to export.");
      }
      return false;
    }

    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (columns && columns.length > 0) {
      // Use configured columns
      headers = columns.map((col) => col.header);
      rows = data.map((item, rowIndex) => {
        return columns.map((col) => {
          let rawVal: any;
          if (col.accessor) {
            rawVal = col.accessor(item, rowIndex);
          } else if (col.key) {
            rawVal = getNestedValue(item, col.key);
          } else {
            rawVal = "";
          }
          return formatCellValue(rawVal, col.format);
        });
      });
    } else {
      // Auto-extract columns from first row
      const firstItem = data[0] as Record<string, any>;
      const keys = Object.keys(firstItem).filter((k) => {
        const lower = k.toLowerCase();
        return (
          !k.startsWith("_") &&
          k !== "actions" &&
          k !== "select" &&
          k !== "id" &&
          k !== "uuid" &&
          k !== "userId" &&
          k !== "createdAt" &&
          k !== "updatedAt" &&
          k !== "deletedAt" &&
          !lower.includes("password") &&
          !lower.includes("token")
        );
      });

      headers = keys.map((k) =>
        k
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim()
      );

      rows = data.map((item: any) => {
        return keys.map((k) => formatCellValue(item[k]));
      });
    }

    // Build worksheet with Array-of-Arrays
    const wb = XLSX.utils.book_new();
    const allAoa: (string | number)[][] = [];
    const calculatedMerges: ExcelMergeRange[] = merges ? [...merges] : [];

    let headerRowStartIndex = 0;

    if (titleBanner) {
      allAoa.push([titleBanner.title]);
      if (titleBanner.subtitle) {
        allAoa.push([titleBanner.subtitle]);
        headerRowStartIndex = 3;
      } else {
        headerRowStartIndex = 2;
      }
      allAoa.push([]); // blank spacer

      // Merge title rows across the table width
      calculatedMerges.push({
        s: { r: 0, c: 0 },
        e: { r: 0, c: Math.max(headers.length - 1, 0) },
      });
      if (titleBanner.subtitle) {
        calculatedMerges.push({
          s: { r: 1, c: 0 },
          e: { r: 1, c: Math.max(headers.length - 1, 0) },
        });
      }
    }

    if (headerRows && headerRows.length > 0) {
      allAoa.push(...headerRows);
    } else {
      allAoa.push(headers);
    }

    allAoa.push(...rows);

    const ws = XLSX.utils.aoa_to_sheet(allAoa);

    if (calculatedMerges.length > 0) {
      ws["!merges"] = calculatedMerges;
    }

    // Apply auto column widths
    const colWidths = calculateColumnWidths(headers, rows);
    ws["!cols"] = colWidths;

    const safeSheetName = sanitizeSheetName(sheetName);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    return downloadWorkbook(wb, filename, data.length, showToast, onSuccess, onError);
  } catch (error: any) {
    console.error("Failed to export Excel file:", error);
    if (showToast) {
      toast.error(
        "Export Error",
        error?.message || "An unexpected error occurred while generating the Excel file."
      );
    }
    onError?.(error);
    return false;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCT CATALOG ROW-WISE EXPORT
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports a clean Excel spreadsheet for Products where:
 * - Each row represents an Item / Pack Size under its Product
 * - Standard readable columns:
 *     #, Product Name, Category, Product Code, HSN Code, Item Name, Pack Size, Price (₹), SKU, Stock, Status
 */
export function exportProductsMatrixToExcel({
  filename = "products_catalog",
  sheetName = "Products",
  products,
  showToast = true,
  onSuccess,
  onError,
}: ExportProductsMatrixOptions): boolean {
  try {
    if (!products || products.length === 0) {
      if (showToast) {
        toast.error("Export Failed", "No products available to export.");
      }
      return false;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

    const bannerRow0 = ["RITHU SNACKS — PRODUCT CATALOG & PRICING LIST"];
    const bannerRow1 = [`Generated: ${formattedDate}  |  Total Products: ${products.length}  |  Currency: INR (₹)`];
    const blankRow: string[] = [];

    const headers = [
      "#",
      "Product Name",
      "Category",
      "Product Code",
      "HSN Code",
      "Item Name",
      "Pack Size",
      "Price (₹)",
      "SKU",
      "Stock",
      "Status",
    ];

    const dataRows: (string | number)[][] = [];
    let rowNumber = 1;

    products.forEach((prod) => {
      const prodName = prod.name || "—";
      const catName = prod.categoryName || (prod.category && prod.category.name) || "—";
      const prodCode = prod.slug || "—";
      const hsnCode =
        prod.hsnCodeName ||
        (prod.hsnCode && (prod.hsnCode.code || prod.hsnCode.name)) ||
        (prod.product_hsn_codes && prod.product_hsn_codes.code) ||
        "—";
      const statusStr = (prod.isActive ?? prod.status ?? true) ? "Active" : "Inactive";
      const items = prod.items || prod.variants || [];

      if (items.length > 0) {
        items.forEach((item: any) => {
          const itemName = item.variantName || item.name || "—";
          const unitPrices = item.unitPrices || [];

          if (unitPrices.length > 0) {
            unitPrices.forEach((up: any) => {
              const packSizeStr =
                up.packSize ||
                (up.unitValue
                  ? `${up.unitValue} ${up.unitCode || up.unitName || ""}`.trim()
                  : up.measurement
                  ? `${up.measurement.value} ${up.measurement.unit}`.trim()
                  : "—");

              const priceNum =
                typeof up.basePrice === "number"
                  ? up.basePrice
                  : typeof up.base_price === "number"
                  ? up.base_price
                  : !isNaN(Number(up.basePrice ?? up.base_price))
                  ? Number(up.basePrice ?? up.base_price)
                  : "—";

              const skuStr = up.sku || item.sku || "—";
              const stockVal =
                typeof up.stock === "number"
                  ? up.stock
                  : typeof up.inventories?.quantity_available === "number"
                  ? up.inventories.quantity_available
                  : "—";

              dataRows.push([
                rowNumber++,
                prodName,
                catName,
                prodCode,
                hsnCode,
                itemName,
                packSizeStr,
                priceNum,
                skuStr,
                stockVal,
                statusStr,
              ]);
            });
          } else {
            dataRows.push([
              rowNumber++,
              prodName,
              catName,
              prodCode,
              hsnCode,
              itemName,
              "—",
              "—",
              item.sku || "—",
              "—",
              statusStr,
            ]);
          }
        });
      } else {
        dataRows.push([
          rowNumber++,
          prodName,
          catName,
          prodCode,
          hsnCode,
          "—",
          "—",
          "—",
          prod.slug || "—",
          "—",
          statusStr,
        ]);
      }
    });

    const summaryRow: (string | number)[] = [
      `Total: ${dataRows.length} Items across ${products.length} Products`,
    ];
    for (let c = 1; c < headers.length; c++) {
      summaryRow.push("");
    }

    const merges: ExcelMergeRange[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 4 + dataRows.length, c: 0 }, e: { r: 4 + dataRows.length, c: headers.length - 1 } },
    ];

    const fullAoa: (string | number)[][] = [
      bannerRow0,
      bannerRow1,
      blankRow,
      headers,
      ...dataRows,
      summaryRow,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(fullAoa);
    ws["!merges"] = merges;
    ws["!cols"] = calculateAoaColumnWidths(fullAoa);

    const safeSheetName = sanitizeSheetName(sheetName);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    return downloadWorkbook(
      wb,
      filename,
      products.length,
      showToast,
      onSuccess,
      onError
    );
  } catch (error: any) {
    console.error("Failed to export products Excel file:", error);
    if (showToast) {
      toast.error(
        "Export Error",
        error?.message || "An unexpected error occurred while generating the Excel file."
      );
    }
    onError?.(error);
    return false;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ITEMS / VARIANTS ROW-WISE EXPORT
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports a clean Excel spreadsheet for Items (Variants) where:
 * - Each row represents a single Pack Size & Price tier under an Item
 * - Standard readable columns:
 *     #, Product, Item Name, Item Code, Dietary Type, Pack Size, Price (₹), SKU, Stock, Shelf Life, Featured, Ready to Mix, Status
 */
export function exportVariantsMatrixToExcel({
  filename = "items_catalog",
  sheetName = "Items",
  variants,
  showToast = true,
  onSuccess,
  onError,
}: ExportVariantsMatrixOptions): boolean {
  try {
    if (!variants || variants.length === 0) {
      if (showToast) {
        toast.error("Export Failed", "No items available to export.");
      }
      return false;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

    const bannerRow0 = ["RITHU SNACKS — ITEMS & PACK SIZES PRICING LIST"];
    const bannerRow1 = [`Generated: ${formattedDate}  |  Total Items: ${variants.length}  |  Currency: INR (₹)`];
    const blankRow: string[] = [];

    const headers = [
      "#",
      "Product",
      "Item Name",
      "Item Code",
      "Short Description",
      "Description",
      "Dietary Type",
      "Pack Size",
      "Price (₹)",
      "SKU",
      "Stock",
      "Shelf Life",
      "Featured",
      "Ready to Mix",
      "Status",
    ];

    const dataRows: (string | number)[][] = [];
    let rowNumber = 1;

    variants.forEach((v) => {
      const productName = v.productName || (v.product && v.product.name) || "—";
      const itemName = v.variantName || v.name || "—";
      const itemCode = v.slug || "—";
      const shortDesc = v.shortDescription || "—";
      const desc = v.description
        ? String(v.description).replace(/<[^>]*>?/gm, "").trim() || "—"
        : "—";
      const vegTypeStr = (() => {
        const vt = (v.vegType || "").toLowerCase();
        if (vt === "veg") return "Veg";
        if (vt === "nonveg" || vt === "non-veg") return "Non-Veg";
        if (vt === "vegan") return "Vegan";
        return "N/A";
      })();
      const shelfLife = v.shelfLife || "—";
      const isFeatured = v.isFeatured ? "Yes" : "No";
      const isReadyToMix = v.isReadyToMix ? "Yes" : "No";
      const statusStr = (v.isActive ?? true) ? "Active" : "Inactive";
      const unitPrices = v.unitPrices || [];

      if (unitPrices.length > 0) {
        unitPrices.forEach((up: any) => {
          const packSizeStr =
            up.packSize ||
            (up.unitValue
              ? `${up.unitValue} ${up.unitCode || up.unitName || ""}`.trim()
              : up.measurement
              ? `${up.measurement.value} ${up.measurement.unit}`.trim()
              : "—");

          const priceNum =
            typeof up.basePrice === "number"
              ? up.basePrice
              : typeof up.base_price === "number"
              ? up.base_price
              : !isNaN(Number(up.basePrice ?? up.base_price))
              ? Number(up.basePrice ?? up.base_price)
              : "—";

          const skuStr = up.sku || v.sku || "—";
          const stockVal =
            typeof up.stock === "number"
              ? up.stock
              : typeof up.inventories?.quantity_available === "number"
              ? up.inventories.quantity_available
              : "—";

          dataRows.push([
            rowNumber++,
            productName,
            itemName,
            itemCode,
            shortDesc,
            desc,
            vegTypeStr,
            packSizeStr,
            priceNum,
            skuStr,
            stockVal,
            shelfLife,
            isFeatured,
            isReadyToMix,
            statusStr,
          ]);
        });
      } else {
        dataRows.push([
          rowNumber++,
          productName,
          itemName,
          itemCode,
          shortDesc,
          desc,
          vegTypeStr,
          "—",
          "—",
          v.sku || "—",
          "—",
          shelfLife,
          isFeatured,
          isReadyToMix,
          statusStr,
        ]);
      }
    });

    const summaryRow: (string | number)[] = [
      `Total: ${dataRows.length} Pack Sizes across ${variants.length} Items`,
    ];
    for (let c = 1; c < headers.length; c++) {
      summaryRow.push("");
    }

    const merges: ExcelMergeRange[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 4 + dataRows.length, c: 0 }, e: { r: 4 + dataRows.length, c: headers.length - 1 } },
    ];

    const fullAoa: (string | number)[][] = [
      bannerRow0,
      bannerRow1,
      blankRow,
      headers,
      ...dataRows,
      summaryRow,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(fullAoa);
    ws["!merges"] = merges;
    ws["!cols"] = calculateAoaColumnWidths(fullAoa);

    const safeSheetName = sanitizeSheetName(sheetName);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    return downloadWorkbook(
      wb,
      filename,
      variants.length,
      showToast,
      onSuccess,
      onError
    );
  } catch (error: any) {
    console.error("Failed to export items Excel file:", error);
    if (showToast) {
      toast.error(
        "Export Error",
        error?.message || "An unexpected error occurred while generating the Excel file."
      );
    }
    onError?.(error);
    return false;
  }
}

