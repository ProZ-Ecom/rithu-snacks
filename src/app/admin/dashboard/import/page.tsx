"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  PackagePlus,
} from "lucide-react";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RejectedRow {
  row: number;
  sheet: string;
  name: string;
  reason: string;
}

interface PreviewItem {
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

interface ImportData {
  totalRows: number;
  successCount: number;
  rejectedCount: number;
  preview: PreviewItem[];
  rejected: RejectedRow[];
  importedCategories: string[];
  importedProducts: string[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "blue" | "amber";
}) {
  const colors = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-semibold mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  colorClass,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  colorClass: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 font-semibold text-sm cursor-pointer ${colorClass}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          {title}{" "}
          <span className="px-2 py-0.5 rounded-full bg-white/60 text-xs font-bold">
            {count}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="bg-white">{children}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // States: idle | previewing | preview_done | importing | done | error
  const [stage, setStage] = useState<
    "idle" | "previewing" | "preview_done" | "importing" | "done" | "error"
  >("idle");
  const [previewData, setPreviewData] = useState<ImportData | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── File selection ───
  const handleFile = (f: File) => {
    if (!f.name.endsWith(".xlsx")) {
      setErrorMsg("Only .xlsx files are supported.");
      return;
    }
    setFile(f);
    setStage("idle");
    setPreviewData(null);
    setImportData(null);
    setErrorMsg(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  // ─── Preview call ───
  const handlePreview = async () => {
    if (!file) return;
    setStage("previewing");
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import/products?preview=true", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || "Preview failed");
      }
      setPreviewData(json.data);
      setStage("preview_done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      setErrorMsg(msg);
      setStage("error");
    }
  };

  // ─── Import call ───
  const handleImport = async () => {
    if (!file) return;
    setStage("importing");
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import/products", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || "Import failed");
      }
      setImportData(json.data);
      setStage("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setErrorMsg(msg);
      setStage("error");
    }
  };

  // ─── Reset ───
  const handleReset = () => {
    setFile(null);
    setStage("idle");
    setPreviewData(null);
    setImportData(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Template Download ───
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/admin/import/template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rithu_snacks_catalog_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("Failed to download template file.");
    }
  };

  const activeData = importData ?? previewData;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bulk Product Import"
        description="Import categories, products, and multi-size variants from a single Excel file (.xlsx)"
        // breadcrumbs={
        //   <AdminBreadcrumb
        //     items={[
        //       { label: "Dashboard", href: "/admin/dashboard" },
        //       { label: "Catalog", href: "/admin/dashboard/products" },
        //       { label: "Bulk Import" },
        //     ]}
        //   />
        // }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2 text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </Button>
        }
      />

      <AdminContent>
        <div className="w-full space-y-6">
          {/* ─── Upload Zone ─── */}
          {stage === "idle" || stage === "error" ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50"
                  : file
                    ? "border-emerald-400 bg-emerald-50/50"
                    : "border-neutral-300 bg-neutral-50 hover:border-amber-400 hover:bg-amber-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              {file ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-3" />
                  <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB • Click to change file
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-neutral-400 mb-3" />
                  <p className="text-sm font-semibold text-neutral-700">
                    Drag & drop your Excel file here
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    or click to browse • Only .xlsx supported
                  </p>
                </>
              )}
            </div>
          ) : null}

          {/* Error display */}
          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <XCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold">Import Error</p>
                <p className="text-xs mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* ─── Action Buttons ─── */}
          {file && (stage === "idle" || stage === "error") && (
            <div className="flex gap-3">
              <Button
                onClick={handlePreview}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Preview Import
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </div>
          )}

          {(stage === "previewing" || stage === "importing") && (
            <div className="flex items-center gap-3 text-sm text-neutral-600 font-medium py-4">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              {stage === "previewing"
                ? "Validating your Excel file..."
                : "Importing catalog data into database..."}
            </div>
          )}

          {/* ─── Preview / Results ─── */}
          {activeData && (stage === "preview_done" || stage === "done") && (
            <div className="space-y-5">
              {/* Status banner */}
              {stage === "done" && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-700 text-sm">
                      Import Completed Successfully!
                    </p>
                    <p className="text-xs text-emerald-600">
                      {importData?.importedProducts.length ?? 0} products and{" "}
                      {importData?.importedCategories.length ?? 0} categories added to the
                      database.
                    </p>
                  </div>
                </div>
              )}

              {stage === "preview_done" && (
                <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700 font-medium">
                    This is a <strong>preview only</strong> — no database changes have been
                    made yet. Please review the validated data below and click{" "}
                    <strong>Confirm Import</strong> to proceed.
                  </p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBadge
                  label="Total Rows"
                  value={activeData.totalRows}
                  color="blue"
                />
                <StatBadge
                  label="Will Import"
                  value={activeData.successCount}
                  color="green"
                />
                <StatBadge
                  label="Rejected"
                  value={activeData.rejectedCount}
                  color="red"
                />
                <StatBadge
                  label="Products"
                  value={activeData.preview.length}
                  color="amber"
                />
              </div>

              {/* Rejected Rows Table */}
              {activeData.rejected.length > 0 && (
                <CollapsibleSection
                  title="Rejected Rows"
                  count={activeData.rejected.length}
                  colorClass="bg-red-50 text-red-700"
                  icon={<XCircle className="w-4 h-4" />}
                  defaultOpen={true}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
                          <th className="text-left px-4 py-2 font-semibold">Sheet</th>
                          <th className="text-left px-4 py-2 font-semibold">Row</th>
                          <th className="text-left px-4 py-2 font-semibold">Name / SKU</th>
                          <th className="text-left px-4 py-2 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeData.rejected.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-neutral-50 hover:bg-red-50/40"
                          >
                            <td className="px-4 py-2 font-medium text-neutral-600">
                              {r.sheet}
                            </td>
                            <td className="px-4 py-2 text-neutral-500">#{r.row}</td>
                            <td className="px-4 py-2 font-semibold text-neutral-700">
                              {r.name}
                            </td>
                            <td className="px-4 py-2 text-red-600">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {/* Success Preview */}
              {activeData.preview.length > 0 && (
                <CollapsibleSection
                  title="Products to Import"
                  count={activeData.preview.length}
                  colorClass="bg-emerald-50 text-emerald-700"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  defaultOpen={true}
                >
                  <div className="divide-y divide-neutral-100">
                    {activeData.preview.map((prod, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="text-sm font-bold text-neutral-800">
                              {prod.productName}
                            </p>
                            <p className="text-xs text-neutral-400">
                              SKU: <span className="font-mono font-semibold">{prod.sku}</span>
                              {" • "}Category:{" "}
                              <span className="font-semibold text-emerald-600">
                                {prod.categoryName}
                              </span>
                            </p>
                          </div>
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {prod.variants.length} variant{prod.variants.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {prod.variants.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                            {prod.variants.map((v, j) => (
                              <div
                                key={j}
                                className={`rounded-lg border px-3 py-2 text-xs ${
                                  v.isDefault
                                    ? "border-emerald-300 bg-emerald-50/70"
                                    : "border-neutral-200 bg-neutral-50"
                                }`}
                              >
                                <p className="font-semibold text-neutral-700">
                                  {v.variantName}{" "}
                                  {v.isDefault && (
                                    <span className="text-[10px] text-emerald-600 font-bold">
                                      (default)
                                    </span>
                                  )}
                                </p>
                                <p className="text-neutral-400 font-mono">{v.variantSku}</p>
                                <div className="flex gap-3 mt-1 text-neutral-600">
                                  <span>₹{v.price}</span>
                                  <span>Stock: {v.stockQty}</span>
                                  <span>
                                    {v.unitValue} {v.unit}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {stage === "preview_done" &&
                  previewData &&
                  previewData.preview.length > 0 && (
                    <Button
                      onClick={handleImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
                    >
                      <PackagePlus className="w-4 h-4" />
                      Confirm Import ({previewData.preview.length} products)
                    </Button>
                  )}
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {stage === "done" ? "Import Another File" : "Cancel"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </AdminContent>
    </div>
  );
}
