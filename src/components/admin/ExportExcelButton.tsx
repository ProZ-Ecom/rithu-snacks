"use client";

import React, { useState } from "react";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, type ExportColumn } from "@/lib/excel-export";
import { cn } from "@/lib/utils";

export interface ExportExcelButtonProps<T = any> {
  data: T[];
  filename: string;
  sheetName?: string;
  columns?: ExportColumn<T>[];
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
  filename,
  sheetName,
  columns,
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

  const handleExport = () => {
    if (disabled || isExporting || !data || data.length === 0) return;

    setIsExporting(true);
    onExportStart?.();

    // Brief timeout to let UI indicate loading for huge datasets
    setTimeout(() => {
      try {
        exportToExcel({
          filename,
          sheetName: sheetName || filename,
          data,
          columns,
        });
      } finally {
        setIsExporting(false);
        onExportEnd?.();
      }
    }, 50);
  };

  const displayText =
    label ??
    (selectedCount && selectedCount > 0
      ? `Export Selected (${selectedCount})`
      : "Export Excel");

  const isDataEmpty = !data || data.length === 0;

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
      title={isDataEmpty ? "No data available to export" : `Export to ${filename}.xlsx`}
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
