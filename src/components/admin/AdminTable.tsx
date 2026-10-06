"use client";

import * as React from "react";
import { Download, X, FileSpreadsheet } from "lucide-react";
import { DataTable, type DataTableProps } from "@/components/admin/data-table/DataTable";
import { exportToExcel, type ExportColumn } from "@/lib/excel-export";
import { cn } from "@/lib/utils";

interface AdminTableProps<TData, TValue> extends DataTableProps<TData, TValue> {
  onExport?: (rows: TData[]) => void;
  exportFileName?: string;
  exportSheetName?: string;
  exportColumns?: ExportColumn<TData>[];
  bulkActions?: React.ReactNode;
}

function AdminTable<TData, TValue>({
  columns,
  data,
  onExport,
  exportFileName,
  exportSheetName,
  exportColumns,
  bulkActions,
  ...props
}: AdminTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<Record<number, boolean>>({});
  const [tableKey, setTableKey] = React.useState(0);

  const selectedCount = Object.keys(rowSelection).length;
  const hasSelection = selectedCount > 0;

  const handleClearSelection = () => {
    setRowSelection({});
    setTableKey((k) => k + 1);
  };

  const handleExport = () => {
    const rowsToExport = hasSelection
      ? data.filter((_, index) => rowSelection[index])
      : data;

    if (onExport) {
      onExport(rowsToExport);
    } else if (exportFileName || exportColumns) {
      exportToExcel({
        filename: exportFileName || "table_export",
        sheetName: exportSheetName || "Data",
        data: rowsToExport,
        columns: exportColumns,
      });
    }
  };

  const showExportButton = Boolean(onExport || exportFileName || exportColumns);

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col space-y-4">
      {hasSelection && bulkActions && (
        <div className="flex-shrink-0 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">
              {selectedCount} row(s) selected
            </span>
            <button
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {showExportButton && (
        <div className="flex-shrink-0 flex justify-end">
          <button
            onClick={handleExport}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-sm font-semibold",
              "text-emerald-800 hover:bg-emerald-50 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs"
            )}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export{hasSelection ? ` (${selectedCount})` : " All"}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <DataTable
          key={tableKey}
          columns={columns}
          data={data}
          {...props}
        />
      </div>
    </div>
  );
}

export { AdminTable };
export type { AdminTableProps };

