"use client";

import React from "react";
import { Trash2, X, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkActionsBarProps {
  selectedCount: number;
  entityName?: string;
  filterNotice?: string;
  onClearSelection: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  isDeleting?: boolean;
  isExporting?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  entityName = "item",
  filterNotice,
  onClearSelection,
  onDelete,
  onExport,
  isDeleting = false,
  isExporting = false,
  extraActions,
  className,
}: BulkActionsBarProps) {
  if (selectedCount <= 0) return null;

  const pluralEntity =
    entityName.endsWith("y")
      ? `${entityName.slice(0, -1)}ies`
      : `${entityName}s`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 mb-3 bg-white border border-cream-border rounded-xl shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold bg-secondary-600 text-white">
          {selectedCount}
        </span>
        <span className="text-sm font-semibold text-neutral-800">
          {selectedCount === 1
            ? `${entityName} selected`
            : `${pluralEntity} selected`}
        </span>
        {filterNotice && (
          <span className="text-xs px-2.5 py-1 rounded-lg bg-cream-100 border border-cream-border text-neutral-600 font-medium">
            {filterNotice}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-9 px-3 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-cream-200/80 rounded-xl transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5 mr-1 text-neutral-500" />
          Deselect all
        </Button>

        {onExport && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
            className="h-9 sm:h-10 px-3.5 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 hover:border-emerald-400 font-semibold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            )}
            Export ({selectedCount})
          </Button>
        )}

        {extraActions}

        {onDelete && (
          <Button
            type="button"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-9 sm:h-10 px-4 rounded-xl bg-secondary-600 hover:bg-secondary-700 text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Delete Selected
          </Button>
        )}
      </div>
    </div>
  );
}

