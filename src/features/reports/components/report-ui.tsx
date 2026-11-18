"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Minus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { type ExportColumn } from "@/lib/excel-export";
import { downloadCsv, formatCsvDateTime } from "@/lib/export-csv";
import { cn } from "@/lib/utils";

export { formatCsvDateTime };

/* ------------------------------------------------------------------ formatting */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const counter = new Intl.NumberFormat("en-IN");

export const money = (n: number | null | undefined) => (n == null ? "—" : inr.format(n));
export const moneyExact = (n: number | null | undefined) => (n == null ? "—" : inrExact.format(n));
export const count = (n: number | null | undefined) => (n == null ? "—" : counter.format(n));
export const percent = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);
export const days = (n: number | null | undefined) => (n == null ? "—" : `${n} day${n === 1 ? "" : "s"}`);

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Turns a bucket key (2026-11-06, 2026-11 or a Monday) into something readable on an axis. */
export function bucketLabel(key: string, bucket: "day" | "week" | "month") {
  if (bucket === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  const d = new Date(key);
  if (Number.isNaN(d.getTime())) return key;
  const short = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return bucket === "week" ? `w/c ${short}` : short;
}

/* ----------------------------------------------------------------- date presets */

export interface DatePreset {
  id: string;
  label: string;
  range: () => { dateFrom: string; dateTo: string };
}

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const DATE_PRESETS: DatePreset[] = [
  { id: "today", label: "Today", range: () => ({ dateFrom: iso(new Date()), dateTo: iso(new Date()) }) },
  { id: "yesterday", label: "Yesterday", range: () => ({ dateFrom: iso(shift(-1)), dateTo: iso(shift(-1)) }) },
  {
    id: "this_week",
    label: "This Week",
    range: () => {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const mon = shift(-diffToMonday);
      return { dateFrom: iso(mon), dateTo: iso(now) };
    },
  },
  {
    id: "last_week",
    label: "Last Week",
    range: () => {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const lastMon = shift(-diffToMonday - 7);
      const lastSun = shift(-diffToMonday - 1);
      return { dateFrom: iso(lastMon), dateTo: iso(lastSun) };
    },
  },
  {
    id: "this_month",
    label: "This Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: iso(start), dateTo: iso(now) };
    },
  },
  {
    id: "last_month",
    label: "Last Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: iso(start), dateTo: iso(end) };
    },
  },
  {
    id: "this_year",
    label: "This Year",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: iso(start), dateTo: iso(now) };
    },
  },
  // Compatibility aliases
  { id: "7d", label: "This Week", range: () => ({ dateFrom: iso(shift(-6)), dateTo: iso(new Date()) }) },
  { id: "30d", label: "This Month", range: () => ({ dateFrom: iso(shift(-29)), dateTo: iso(new Date()) }) },
  {
    id: "month",
    label: "This Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: iso(start), dateTo: iso(now) };
    },
  },
  {
    id: "lastMonth",
    label: "Last Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: iso(start), dateTo: iso(end) };
    },
  },
  {
    id: "year",
    label: "This Year",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: iso(start), dateTo: iso(now) };
    },
  },
];

export const DISPLAY_PRESETS: { id: string; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
];

export const DEFAULT_PRESET = "this_month";

export function presetRange(id: string) {
  const found = DATE_PRESETS.find((p) => p.id === id);
  if (found) return found.range();
  if (id === "7d") return presetRange("this_week");
  if (id === "month" || id === "30d") return presetRange("this_month");
  if (id === "lastMonth") return presetRange("last_month");
  if (id === "year") return presetRange("this_year");
  return presetRange("this_month");
}

/* ------------------------------------------------------------------ filter bar */

export interface ExtraFilter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ReportFiltersProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  extras?: ExtraFilter[];
  children?: React.ReactNode;
}

function normalizePresetId(p?: string) {
  if (!p) return DEFAULT_PRESET;
  if (p === "7d") return "this_week";
  if (p === "month" || p === "30d") return "this_month";
  if (p === "lastMonth") return "last_month";
  if (p === "year") return "this_year";
  return p;
}

/**
 * Automatically determine which preset is active based on preset ID or matching dateFrom / dateTo.
 */
function resolveActivePreset(
  preset?: string,
  dateFrom?: string,
  dateTo?: string
): string {
  if (preset === "custom") return "custom";

  // If a preset is specified and recognized, normalize and return it
  if (preset) {
    const norm = normalizePresetId(preset);
    if (DISPLAY_PRESETS.some((d) => d.id === norm)) {
      return norm;
    }
  }

  // If dates are present, check if they match any known preset range
  if (dateFrom && dateTo) {
    for (const p of DATE_PRESETS) {
      try {
        const r = p.range();
        if (r.dateFrom === dateFrom && r.dateTo === dateTo) {
          return normalizePresetId(p.id);
        }
      } catch {
        // ignore
      }
    }
    return "custom";
  }

  return DEFAULT_PRESET;
}

/**
 * Filter bar matching Dashboard tab styling (stone-100 rounded segmented container,
 * smooth preset switching, live date window badge, and custom range support).
 */
export function ReportFilters({ value, onChange, extras = [], children }: ReportFiltersProps) {
  const activePreset = resolveActivePreset(value.preset, value.dateFrom, value.dateTo);
  const isCustom = activePreset === "custom";

  const setPreset = (id: string) => {
    if (id === "custom") {
      onChange({ ...value, preset: "custom" });
      return;
    }
    onChange({ ...value, preset: id, ...presetRange(id) });
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Segmented Tabs matching Dashboard Overview & Recent Dispatch Orders */}
        <div className="inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80 overflow-x-auto max-w-full scrollbar-none">
          {DISPLAY_PRESETS.map((p) => {
            const isActive = !isCustom && activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setPreset(p.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-white text-stone-900 shadow-xs font-bold ring-1 ring-stone-900/5"
                    : "text-stone-500 hover:text-stone-900"
                )}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={isCustom}
            onClick={() => setPreset("custom")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap",
              isCustom
                ? "bg-white text-stone-900 shadow-xs font-bold ring-1 ring-stone-900/5"
                : "text-stone-500 hover:text-stone-900"
            )}
          >
            Custom
          </button>
        </div>

        {/* Date Window Badge */}
        {value.dateFrom && value.dateTo && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-stone-500" />
            <span className="font-mono text-[11px] font-semibold text-stone-800">
              {value.dateFrom} to {value.dateTo}
            </span>
          </div>
        )}
      </div>

      {(isCustom || extras.length > 0 || children) && (
        <div className="flex flex-wrap items-end gap-3 border-t border-stone-100 pt-3">
          {isCustom && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                <span>From</span>
                <input
                  type="date"
                  className="h-9 w-40 rounded-xl border border-stone-200/80 bg-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary-500"
                  value={value.dateFrom ?? ""}
                  max={value.dateTo || undefined}
                  onChange={(e) => onChange({ ...value, preset: "custom", dateFrom: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                <span>To</span>
                <input
                  type="date"
                  className="h-9 w-40 rounded-xl border border-stone-200/80 bg-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-secondary-500"
                  value={value.dateTo ?? ""}
                  min={value.dateFrom || undefined}
                  onChange={(e) => onChange({ ...value, preset: "custom", dateTo: e.target.value })}
                />
              </label>
            </>
          )}

          {extras.map((f) => (
            <div key={f.name} className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              <span>{f.label}</span>
              <div className="w-52">
                <Select
                  className="h-9 rounded-xl bg-white border-stone-200/80 text-xs"
                  value={value[f.name] ?? ""}
                  onValueChange={(v) => onChange({ ...value, [f.name]: v })}
                  options={[{ value: "", label: "All" }, ...f.options]}
                  aria-label={f.label}
                />
              </div>
            </div>
          ))}

          {children}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- layout */

export function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs overflow-visible",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={title || action ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

/** A plain-language note for anything a number cannot say on its own. */
export function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed",
        tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800"
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- metric cards */

export function DeltaBadge({ value, compareLabel }: { value: number | null | undefined; compareLabel?: string }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
        <Minus className="h-3 w-3" /> no earlier data
      </span>
    );
  }
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title={compareLabel ? `Compared with the ${compareLabel}` : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        flat ? "bg-neutral-100 text-neutral-600" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "no change" : `${up ? "+" : ""}${value}%`}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  compareLabel,
  tone = "default",
  icon: Icon,
  accentBorder,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  delta?: number | null;
  compareLabel?: string;
  tone?: "default" | "good" | "warn" | "bad" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  accentBorder?: string;
}) {
  const border =
    accentBorder ??
    (tone === "good"
      ? "border-l-success-600"
      : tone === "warn"
      ? "border-l-amber-600"
      : tone === "bad"
      ? "border-l-danger-base"
      : "border-l-secondary-600");

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-cream-border bg-white p-3.5 shadow-xs border-l-[3.5px] transition-all hover:shadow-sm",
        border
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10.5px] font-bold tracking-wider text-neutral-400 uppercase truncate">
          {label}
        </span>
        {Icon && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cream-100 text-secondary-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
        {value}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] font-medium text-neutral-500">
        {delta !== undefined && <DeltaBadge value={delta} compareLabel={compareLabel} />}
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- tables */

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Plain value for CSV / Excel; falls back to the cell when it is a string or number. */
  csv?: (row: T) => string | number | null;
  align?: "left" | "right";
  className?: string;
  sortable?: boolean;
}

export interface DataTableTab<T> {
  key: string;
  label: string;
  count?: number;
  filter?: (row: T) => boolean;
}

/** ID Badge matching Recent Dispatch Orders (monospace bold green pill) */
export function IdBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/15 text-xs">
      {children}
    </span>
  );
}

/** Status Badge matching Recent Dispatch Orders styling */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const styles: Record<string, { bg: string; text: string; ring: string }> = {
    confirmed: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/20" },
    processing: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20" },
    packed: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/20" },
    delivered: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
    shipped: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-600/20" },
    out_for_delivery: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-600/20" },
    pending: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-600/20" },
    cancelled: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/20" },
    returned: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-600/20" },
    paid: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
    failed: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/20" },
  };
  const current = styles[s] ?? { bg: "bg-stone-50", text: "text-stone-700", ring: "ring-stone-600/20" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 capitalize", current.bg, current.text, current.ring)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Payment Method with green dot indicator */
export function PaymentIndicator({ method }: { method?: string | null }) {
  if (!method) return <span className="text-stone-400">—</span>;
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      <span className="uppercase">{method}</span>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing in this period.",
  emptyHint,
  maxHeight,
  searchPlaceholder,
  exportFileName,
  exportSheetName = "Report",
  showSearch,
  showExport,
  defaultPageSize = 20,
  tabs,
  activeTabKey,
  onTabChange,
  counterBadge,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey?: (row: T) => string;
  empty?: string;
  emptyHint?: string;
  maxHeight?: string;
  searchPlaceholder?: string;
  exportFileName?: string;
  exportSheetName?: string;
  showSearch?: boolean;
  showExport?: boolean;
  defaultPageSize?: number;
  tabs?: DataTableTab<T>[];
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
  counterBadge?: React.ReactNode;
}) {
  const [internalTab, setInternalTab] = React.useState<string>(tabs && tabs.length > 0 ? tabs[0].key : "all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [sortCol, setSortCol] = React.useState<number | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const currentTabKey = activeTabKey ?? internalTab;

  const handleTabClick = (key: string) => {
    setInternalTab(key);
    onTabChange?.(key);
    setPage(1);
  };

  // Filter rows by active tab
  const tabFilteredRows = React.useMemo(() => {
    if (!tabs || tabs.length === 0) return rows;
    const currentTab = tabs.find((t) => t.key === currentTabKey);
    if (!currentTab || !currentTab.filter) return rows;
    return rows.filter(currentTab.filter);
  }, [rows, tabs, currentTabKey]);

  const shouldShowSearch = showSearch ?? (rows.length > 5 || !!searchPlaceholder);
  const shouldShowExport = showExport ?? !!exportFileName;

  // Filter rows by search keyword across all columns
  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return tabFilteredRows;
    const q = search.trim().toLowerCase();
    return tabFilteredRows.filter((row) =>
      columns.some((c) => {
        let val: any = "";
        if (c.csv) {
          val = c.csv(row);
        } else {
          const raw = c.cell(row);
          if (typeof raw === "string" || typeof raw === "number") {
            val = raw;
          } else if (raw && typeof raw === "object" && "props" in (raw as any)) {
            val = (raw as any).props?.children;
          }
        }
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [tabFilteredRows, search, columns]);

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (sortCol === null || sortCol >= columns.length) return filteredRows;
    const c = columns[sortCol];
    return [...filteredRows].sort((a, b) => {
      const getVal = (row: T) => {
        if (c.csv) return c.csv(row);
        const raw = c.cell(row);
        if (typeof raw === "string" || typeof raw === "number") return raw;
        if (raw && typeof raw === "object" && "props" in (raw as any)) return (raw as any).props?.children;
        return "";
      };
      const valA = getVal(a);
      const valB = getVal(b);

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortCol, sortDir, columns]);

  // Reset page when search or pageSize changes
  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, currentTabKey]);

  // Pagination bounds
  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startEntry = totalItems > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endEntry = totalItems > 0 ? Math.min(safePage * pageSize, totalItems) : 0;
  const paginatedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  };

  const exportColumns = React.useMemo<ExportColumn<T>[]>(
    () =>
      columns.map((c) => ({
        header: c.header,
        key: c.header.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        accessor: (row: T) => {
          if (c.csv) return c.csv(row);
          const raw = c.cell(row);
          if (typeof raw === "string" || typeof raw === "number") return raw;
          if (raw && typeof raw === "object" && "props" in (raw as any)) return (raw as any).props?.children ?? "";
          return "";
        },
      })),
    [columns]
  );

  return (
    <div className="w-full flex-1 min-h-[220px] flex flex-col justify-between rounded-2xl overflow-hidden border border-stone-200/90 bg-white shadow-2xs relative">
      {/* Top Controls Row matching Recent Dispatch Orders */}
      {(tabs || shouldShowSearch || shouldShowExport || counterBadge) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:px-5 border-b border-stone-100 bg-white">
          {/* Left Side: Search Input Bar */}
          <div className="flex items-center gap-2.5 flex-1 max-w-sm">
            {shouldShowSearch && (
              <SearchInput
                placeholder={searchPlaceholder ?? "Search records..."}
                value={search}
                onSearch={(val) => {
                  setSearch(val.trim());
                  setPage(1);
                }}
                className="w-full sm:w-64 bg-stone-50 border-stone-200/80 rounded-xl text-xs h-9"
              />
            )}
          </div>

          {/* Right Side: Counter Badge, Segmented Tabs & Single Export Excel Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
            {counterBadge && (
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                {counterBadge}
              </span>
            )}
            {tabs && tabs.length > 0 && (
              <div className="inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80 overflow-x-auto max-w-full scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = currentTabKey === tab.key;
                  const tabCount = tab.count !== undefined ? tab.count : tab.filter ? rows.filter(tab.filter).length : rows.length;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleTabClick(tab.key)}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap",
                        isActive
                          ? "bg-white text-stone-900 shadow-xs"
                          : "text-stone-500 hover:text-stone-900"
                      )}
                    >
                      {tab.label}
                      <span className="ml-1 text-[11px] opacity-75">({tabCount})</span>
                    </button>
                  );
                })}
              </div>
            )}
            {shouldShowExport && (
              <ExportExcelButton
                data={sortedRows}
                filename={exportFileName ?? "report_export"}
                sheetName={exportSheetName.slice(0, 31)}
                columns={exportColumns}
              />
            )}
          </div>
        </div>
      )}

      {/* Table Body with Deep Maroon Header */}
      <div className={cn("min-h-0 flex-1 flex flex-col relative", maxHeight)}>
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-auto scrollbar-thin">
          <table className="w-full min-w-[640px] table-auto caption-bottom text-left text-xs sm:text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-30 shadow-xs bg-[#7A2224]">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={`${i}-${c.header}`}
                    onClick={() => handleSort(i)}
                    className={cn(
                      "h-11 px-3.5 sm:px-4 text-left align-middle text-[11px] font-bold tracking-wider whitespace-nowrap text-white uppercase bg-[#7A2224] border-b border-[#5a1911] cursor-pointer select-none hover:text-white/80 transition-colors",
                      c.align === "right" && "text-right",
                      c.className
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5 text-white", c.align === "right" ? "justify-end" : "justify-start")}>
                      <span>{c.header}</span>
                      <span className="text-white/80">
                        {sortCol === i ? (
                           sortDir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-white" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-white/60 hover:text-white" />
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => (
                  <tr
                    key={rowKey ? rowKey(row) : idx}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    {columns.map((c, i) => (
                      <td
                        key={`${i}-${c.header}`}
                        className={cn(
                          "px-3.5 sm:px-4 py-3.5 align-middle whitespace-nowrap text-xs sm:text-sm text-stone-800",
                          c.align === "right" && "text-right tabular-nums",
                          c.className
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-28 text-center text-stone-500 bg-white border-b border-stone-100 text-xs sm:text-sm font-medium"
                  >
                    <p className="font-semibold text-stone-700">{empty}</p>
                    {emptyHint && <p className="mt-1 max-w-sm mx-auto text-xs text-stone-400">{emptyHint}</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bottom Pagination */}
      <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-2.5 flex-shrink-0 border-t border-stone-100 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-stone-600">
          <p className="font-medium">
            Showing {startEntry}–{endEntry} of {totalItems} entries
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
              Rows per page:
            </span>
            <div className="w-20">
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                options={[10, 20, 30, 50].map((opt) => ({
                  value: String(opt),
                  label: String(opt),
                }))}
                size="sm"
                placement="top"
                className="h-8 rounded-lg font-semibold text-xs border-stone-200"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-stone-700 px-1">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Official Excel export button matching Orders module styling */
export function ExportButton<T>({
  rows,
  columns,
  fileName,
  label = "Export Excel",
}: {
  rows: T[];
  columns: Column<T>[];
  fileName: string;
  label?: string;
}) {
  const exportColumns = React.useMemo<ExportColumn<T>[]>(
    () =>
      columns.map((c) => ({
        header: c.header,
        key: c.header.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        accessor: (row: T) => {
          if (c.csv) return c.csv(row);
          const raw = c.cell(row);
          if (typeof raw === "string" || typeof raw === "number") return raw;
          if (raw && typeof raw === "object" && "props" in (raw as any)) return (raw as any).props?.children ?? "";
          return "";
        },
      })),
    [columns]
  );

  return (
    <ExportExcelButton
      data={rows}
      filename={fileName}
      sheetName={fileName.slice(0, 31)}
      columns={exportColumns}
      label={label}
      size="sm"
    />
  );
}

/** Inline share bar, so a table reads at a glance without a separate chart. */
export function ShareBar({ share }: { share: number }) {
  const width = Math.max(0, Math.min(100, share));
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-cream-200 sm:block" aria-hidden>
        <span className="block h-full rounded-full bg-secondary-600" style={{ width: `${width}%` }} />
      </span>
      <span className="tabular-nums text-neutral-700 font-medium">{share}%</span>
    </span>
  );
}

/* ---------------------------------------------------------------------- charts */

export interface SeriesDef<T> {
  key: string;
  label: string;
  value: (row: T) => number;
  color: string;
  /** Bars read better for counts, the line for money. */
  kind?: "line" | "bar";
}

/**
 * Small multi-series chart drawn as inline SVG - no chart dependency, and it
 * scales down to a phone. Each point carries a <title> so hovering reads the value.
 */
export function TrendChart<T extends { bucket: string }>({
  data,
  series,
  bucket,
  format = (n) => String(n),
  height = 320,
}: {
  data: T[];
  series: SeriesDef<T>[];
  bucket: "day" | "week" | "month";
  format?: (n: number) => string;
  height?: number;
}) {
  const chartUniqueId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const greenGradId = `greenAreaGradient-${chartUniqueId}`;
  const redGradId = `redAreaGradient-${chartUniqueId}`;

  const [activeSeriesKey, setActiveSeriesKey] = React.useState<string>(series[0]?.key ?? "main");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!data || data.length === 0) {
    return <p className="px-5 py-12 text-center text-xs text-stone-500">No activity recorded in this period.</p>;
  }

  const currentSeries = series.find((s) => s.key === activeSeriesKey) ?? series[0];

  const safeNum = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Ensure at least 2 points for smooth spline calculation
  const safeData =
    data.length === 1
      ? [data[0], { ...data[0], bucket: `${data[0].bucket} ` }]
      : data;

  // SVG dimensions matching Dashboard SalesRevenueOverview
  const width = 1000;
  const paddingX = 55;
  const paddingTop = 60;
  const paddingBottom = 45;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = safeData.map((d) => safeNum(currentSeries.value(d)));
  const rawMax = Math.max(...values, 1);
  const maxVal = rawMax * 1.35; // 35% safety headroom so peaks never touch top boundary
  const minVal = 0;

  // Overview metrics
  const totalVal = values.reduce((acc, v) => acc + v, 0);
  const avgVal = safeData.length > 0 ? Math.round(totalVal / safeData.length) : 0;
  const peakIndex = values.indexOf(rawMax);

  // Active point
  const activeIndex =
    hoveredIndex !== null
      ? hoveredIndex
      : peakIndex !== -1
      ? peakIndex
      : safeData.length - 1;

  // Coordinates calculation
  const points = safeData.map((d, i) => {
    const val = safeNum(currentSeries.value(d));
    const x = paddingX + (i / (safeData.length - 1 || 1)) * chartWidth;
    const y = height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, data: d, val, index: i };
  });

  // Calculate Segment Paths & Directional Color (Green when upward, Red when downward)
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    const path = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    const areaPath = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} L ${p2.x},${height - paddingBottom} L ${p1.x},${height - paddingBottom} Z`;

    const isUp = p2.val >= p1.val;

    segments.push({
      index: i,
      path,
      areaPath,
      isUp,
      startPoint: p1,
      endPoint: p2,
    });
  }

  // Active point relative diff
  const activePt = points[activeIndex] || points[0];
  const prevVal = activeIndex > 0 ? points[activeIndex - 1].val : activePt.val;
  const currVal = activePt.val ?? 0;
  const isActiveUp = currVal >= prevVal;
  const activeDiff = currVal - prevVal;
  const activePercent =
    prevVal > 0 ? Math.round((Math.abs(activeDiff) / prevVal) * 100) : activeDiff > 0 ? 100 : 0;

  // Horizontal Grid levels (20%, 50%, 80%)
  const gridLevels = [0.8, 0.5, 0.2];

  // Tooltip dynamic positioning & boundary clipping prevention
  const topPct = (activePt.y / height) * 100;
  const leftPct = (activePt.x / width) * 100;
  const placeBelow = topPct < 32;

  let translateX = "-50%";
  if (activeIndex === 0) translateX = "0%";
  else if (activeIndex === safeData.length - 1) translateX = "-100%";

  const translateY = placeBelow ? "16px" : "calc(-100% - 14px)";

  return (
    <div className="relative w-full select-none overflow-visible">
      {/* Top Controls Row: Legend + Series Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
        {/* Visual Trend Legend matching Dashboard */}
        <div className="flex items-center gap-3 text-xs bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/70">
          <span className="flex items-center gap-1.5 font-medium text-stone-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            Upward Growth
          </span>
          <span className="flex items-center gap-1.5 font-medium text-stone-700">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            Downward Margin
          </span>
        </div>

        {/* Series Toggle Pills matching Dashboard */}
        {series.length > 1 && (
          <div className="inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80 overflow-x-auto max-w-full scrollbar-none">
            {series.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSeriesKey(s.key)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap",
                  activeSeriesKey === s.key
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Metrics Overview Row matching Dashboard */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 py-1.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-stone-500">Average in Period</span>
          <span className="mt-0.5 text-base sm:text-lg font-bold text-stone-900">{format(avgVal)}</span>
        </div>
        <div className="flex flex-col border-stone-100 sm:border-l sm:pl-4">
          <span className="text-xs font-medium text-stone-500">Peak Momentum</span>
          <span className="mt-0.5 text-base sm:text-lg font-bold text-stone-900">{format(rawMax)}</span>
        </div>
        <div className="flex flex-col border-stone-100 sm:border-l sm:pl-4">
          <span className="text-xs font-medium text-stone-500">Total in Period</span>
          <span className="mt-0.5 text-base sm:text-lg font-bold text-stone-900">{format(totalVal)}</span>
        </div>
      </div>

      {/* Interactive SVG Spline Chart */}
      <div className="relative mt-4 sm:mt-6 w-full select-none pt-2 overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-60 sm:h-72 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Emerald Green Area Gradient */}
            <linearGradient id={greenGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#22c55e" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
            </linearGradient>

            {/* Crimson Red Area Gradient */}
            <linearGradient id={redGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#f87171" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & scale ticks */}
          {gridLevels.map((lvl, idx) => {
            const yPos = height - paddingBottom - lvl * chartHeight;
            const labelVal = Math.round(maxVal * lvl);
            const displayLabel =
              labelVal >= 1000
                ? format(Math.round(labelVal / 1000) * 1000)
                : format(labelVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={yPos}
                  x2={width - paddingX}
                  y2={yPos}
                  stroke="#e7e5e4"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 12}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[11px] fill-stone-400 font-medium"
                >
                  {displayLabel}
                </text>
              </g>
            );
          })}

          {/* Segment Area Fills */}
          {segments.map((seg) => (
            <path
              key={`area-${seg.index}`}
              d={seg.areaPath}
              fill={seg.isUp ? `url(#${greenGradId})` : `url(#${redGradId})`}
              className="transition-all duration-300"
            />
          ))}

          {/* Segment Glows */}
          {segments.map((seg) => (
            <path
              key={`glow-${seg.index}`}
              d={seg.path}
              fill="none"
              stroke={seg.isUp ? "#22c55e" : "#f87171"}
              strokeWidth="7"
              strokeOpacity="0.22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Segment Crisp Lines */}
          {segments.map((seg) => (
            <path
              key={`line-${seg.index}`}
              d={seg.path}
              fill="none"
              stroke={seg.isUp ? "#16a34a" : "#ef4444"}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          ))}

          {/* Active / Peak Drop Line & Indicator */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                y1={activePt.y}
                x2={activePt.x}
                y2={height - paddingBottom}
                stroke={isActiveUp ? "#16a34a" : "#ef4444"}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="10"
                fill={isActiveUp ? "#22c55e" : "#ef4444"}
                opacity="0.25"
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="6"
                fill="#ffffff"
                stroke={isActiveUp ? "#15803d" : "#dc2626"}
                strokeWidth="3"
                className="transition-all duration-150"
              />
            </g>
          )}

          {/* Interactive Hover Zones & Points */}
          {points.map((pt, i) => {
            const isPtUp = i === 0 || pt.val >= points[i - 1].val;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={pt.x - chartWidth / (points.length * 2)}
                  y={0}
                  width={chartWidth / points.length}
                  height={height}
                  fill="transparent"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === i ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke={isPtUp ? "#16a34a" : "#ef4444"}
                  strokeWidth="2.5"
                  opacity={hoveredIndex === i || i === peakIndex ? 1 : 0.65}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Bubble for Active/Peak Point */}
        {activePt && (
          <div
            className="pointer-events-none absolute z-30 transition-all duration-200"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: `translate(${translateX}, ${translateY})`,
            }}
          >
            <div className="rounded-xl bg-stone-900/95 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-xs ring-1 ring-white/10 min-w-48 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-stone-300">
                  {bucketLabel(activePt.data.bucket, bucket)}
                </span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    isActiveUp ? "bg-emerald-400" : "bg-rose-400"
                  )}
                ></span>
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                {format(activePt.val)}
              </div>
              {activeIndex > 0 && (
                <div
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-1 mt-0.5",
                    isActiveUp ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {isActiveUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>
                    {isActiveUp ? "+" : "-"}
                    {format(Math.abs(activeDiff))} ({activePercent}%)
                  </span>
                  <span className="text-stone-400 text-[10px] font-normal">vs prev</span>
                </div>
              )}
              {Boolean((activePt.data as any).orders != null || (activePt.data as any).itemsSold != null) && (
                <div className="text-[11px] text-stone-300 font-medium truncate mt-1 pt-1 border-t border-stone-800">
                  {(activePt.data as any).orders != null ? `${(activePt.data as any).orders} Orders` : ""}
                  {(activePt.data as any).itemsSold != null ? ` • ${(activePt.data as any).itemsSold} Items` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* X-Axis Milestone Date Labels */}
        <div className="relative mt-2 h-7 text-[11px] font-semibold text-stone-500 select-none">
          {safeData.map((item, idx) => {
            const isSelected = idx === activeIndex;
            const isItemUp = idx === 0 || values[idx] >= values[idx - 1];
            const pt = points[idx];
            if (!pt) return null;

            const showLabel =
              safeData.length <= 12 ||
              idx === 0 ||
              idx === safeData.length - 1 ||
              (safeData.length > 20 ? (idx + 1) % 5 === 0 : (idx + 1) % 3 === 0) ||
              isSelected;

            if (!showLabel) return null;

            const labelLeftPct = (pt.x / width) * 100;

            return (
              <button
                key={`${item.bucket}-${idx}`}
                type="button"
                onClick={() => setHoveredIndex(idx)}
                style={{ left: `${labelLeftPct}%` }}
                className={cn(
                  "absolute -translate-x-1/2 transition-all text-center cursor-pointer px-1.5 py-0.5 rounded whitespace-nowrap",
                  isSelected
                    ? isItemUp
                      ? "font-bold text-emerald-700 underline underline-offset-4 bg-emerald-50 ring-1 ring-emerald-200 z-10 scale-105"
                      : "font-bold text-rose-700 underline underline-offset-4 bg-rose-50 ring-1 ring-rose-200 z-10 scale-105"
                    : "hover:text-stone-900"
                )}
              >
                {bucketLabel(item.bucket, bucket)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const CHART_COLORS = {
  primary: "#2563eb",
  teal: "#0d9488",
  amber: "#d97706",
  rose: "#e11d48",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  slate: "#64748b",
  emerald: "#16a34a",
};

/* ------------------------------------------------------------------- feedback */

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50" />
      <div className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50" />
    </div>
  );
}

export function ReportError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-12 text-center">
      <p className="text-sm font-semibold text-rose-800">This report could not be loaded.</p>
      <p className="max-w-md text-xs text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-9 rounded-xl border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** "1 Oct 2026 – 30 Oct 2026 · 30 days" under the page title. */
export function RangeCaption({ from, to, days: span }: { from: string; to: string; days: number }) {
  return (
    <p className="text-xs text-neutral-500">
      {dateLabel(from)} – {dateLabel(to)} · {span} day{span === 1 ? "" : "s"}
    </p>
  );
}

export function compareLabelFor(span: number) {
  return `previous ${span} day${span === 1 ? "" : "s"}`;
}
