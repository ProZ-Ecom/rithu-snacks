import type { Table } from "@tanstack/react-table";

const SKIPPED_COLUMNS = new Set(["select", "actions", "action", "expander"]);

/**
 * Formats a date or timestamp into a uniform, clean string: YYYY-MM-DD HH:MM:SS.
 * Removes ISO 8601 artifacts (T, .000Z, milliseconds) and handles empty values gracefully.
 */
export function formatCsvDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    // If it's already a clean YYYY-MM-DD date without time, keep it as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // If it's already formatted as YYYY-MM-DD HH:MM:SS, keep it
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return typeof value === "string" ? value : "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatCsvDateTime(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return formatCsvDateTime(value);
  }
  if (Array.isArray(value)) return value.map(formatCell).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(value) && Number.isNaN(Number(value)) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Directly downloads raw rows with headers as a UTF-8 BOM CSV. */
export function downloadCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  fileName: string
): void {
  const headerLine = headers.map((h) => escapeCsv(String(h)));
  const lines = rows.map((row) => row.map((cell) => escapeCsv(formatCell(cell))).join(","));
  const csv = "\uFEFF" + [headerLine.join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = fileName.replace(/\.csv$/i, "").replace(new RegExp(`-${dateStr}$`), "");
  a.download = `${cleanName}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exports the table's rows (selected rows if any, else all rows currently listed) as CSV. */
export function exportTableToCsv<TData>(table: Table<TData>, fileName: string): void {
  const columns = table
    .getAllLeafColumns()
    .filter(
      (c) =>
        c.getIsVisible() &&
        !SKIPPED_COLUMNS.has(c.id.toLowerCase())
    );

  const selected = table.getSelectedRowModel().rows;
  const rows = selected.length ? selected : table.getRowModel().rows;

  const headerLine = columns.map((c) => {
    const h = c.columnDef.header;
    return escapeCsv(typeof h === "string" ? h : c.id);
  });
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        let val: unknown;
        if (typeof c.accessorFn === "function") {
          try {
            val = row.getValue(c.id);
          } catch {
            val = undefined;
          }
        }
        if (val === undefined || val === null) {
          const orig = row.original as Record<string, unknown> | undefined;
          val = orig?.[c.id];
        }
        return escapeCsv(formatCell(val));
      })
      .join(",")
  );

  const csv = "\uFEFF" + [headerLine.join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanName = fileName.replace(/\.csv$/i, "").replace(new RegExp(`-${dateStr}$`), "");
  a.download = `${cleanName}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface CsvColumn<TData> {
  key?: keyof TData | string;
  header: string;
  accessor?: (row: TData) => unknown;
}

/** Exports raw array data to CSV using column definitions or object keys. */
export function exportDataToCsv<TData>(
  data: TData[],
  fileName: string,
  columns?: CsvColumn<TData>[]
): void {
  if (!data || data.length === 0) return;

  const cols: CsvColumn<TData>[] =
    columns && columns.length > 0
      ? columns
      : Object.keys((data[0] || {}) as object)
          .filter((k) => !SKIPPED_COLUMNS.has(k.toLowerCase()))
          .map((k) => ({ key: k, header: k } as CsvColumn<TData>));

  const headerLine = cols.map((c) => escapeCsv(c.header));
  const lines = data.map((row) =>
    cols
      .map((c) => {
        let val: unknown;
        if (c.accessor) {
          val = c.accessor(row);
        } else if (c.key) {
          val = (row as Record<string, unknown>)[c.key as string];
        }
        return escapeCsv(formatCell(val));
      })
      .join(",")
  );

  const csv = "\uFEFF" + [headerLine.join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
