"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, type ExportColumn } from "@/lib/excel-export";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface ExportExcelButtonProps<T = any> {
  data?: T[];
  fetchData?: () => Promise<T[] | undefined | null>;
  totalCount?: number;
  filename: string;
  sheetName?: string;
  columns?: ExportColumn<T>[];
  onCustomExport?: (data: T[]) => boolean | void | Promise<boolean | void>;
  selectedCount?: number;
  disabled?: boolean;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  label?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export function ExportExcelButton<T = any>({
  data,
  fetchData,
  totalCount,
  filename,
  sheetName,
  columns,
  onCustomExport,
  selectedCount,
  disabled = false,
  variant = "outline",
  size = "md",
  className,
  label,
  onExportStart,
  onExportEnd,
}: ExportExcelButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (disabled || isExporting) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      let exportItems: T[] = [];

      if (fetchData) {
        const fetched = await fetchData();
        exportItems = Array.isArray(fetched) ? fetched : [];
      } else if (data && data.length > 0) {
        exportItems = data;
      }

      if (exportItems.length === 0) {
        toast.error("Export Failed", "No data available to export.");
        return;
      }

      if (onCustomExport) {
        await onCustomExport(exportItems);
      } else {
        exportToExcel({
          filename,
          sheetName: sheetName || filename,
          data: exportItems,
          columns,
        });
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error("Export Error", err?.message || "Failed to generate Excel export.");
    } finally {
      setIsExporting(false);
      onExportEnd?.();
    }
  };

  const displayText =
    label ??
    (selectedCount && selectedCount > 0
      ? `Export Selected (${selectedCount})`
      : "Export Excel");

  const isDataEmpty =
    totalCount !== undefined
      ? totalCount === 0
      : !fetchData && (!data || data.length === 0);

  return (
    <Button
      type="button"
      variant={variant}
      size={size === "md" ? undefined : size}
      onClick={handleExport}
      disabled={disabled || isDataEmpty || isExporting}
      className={cn(
        "h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs flex items-center gap-2",
        variant === "outline" &&
          "border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50/80 hover:border-emerald-400 hover:text-emerald-900 active:scale-98",
        (disabled || isDataEmpty || isExporting) && "opacity-50 cursor-not-allowed",
        className
      )}
      title={isDataEmpty ? "No data available to export" : `Export all records to ${filename}.xlsx`}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
      )}
      <span>{displayText}</span>
    </Button>
  );
}
