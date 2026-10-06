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

export interface ExportToExcelOptions<T = any> {
  filename: string;
  sheetName?: string;
  data: T[];
  columns?: ExportColumn<T>[];
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  showToast?: boolean;
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
 * Universal Export to Excel function using XLSX.
 */
export function exportToExcel<T = any>({
  filename,
  sheetName = "Data",
  data,
  columns,
  onSuccess,
  onError,
  showToast = true,
}: ExportToExcelOptions<T>): boolean {
  try {
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
        // Skip internal, system, credential and non-displayed fields
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
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Apply auto column widths
    const colWidths = calculateColumnWidths(headers, rows);
    ws["!cols"] = colWidths;

    const safeSheetName = sanitizeSheetName(sheetName);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    // Generate binary XLSX buffer
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // Create Blob and trigger download
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
        `Exported ${data.length} ${data.length === 1 ? "record" : "records"} to ${finalFilename}`
      );
    }

    onSuccess?.();
    return true;
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
