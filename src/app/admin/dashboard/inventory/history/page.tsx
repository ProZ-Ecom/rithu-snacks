"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { Select } from "@/components/ui/select";
import { useInventoryTransactions } from "@/features/inventory/hooks";
import { getTransactions } from "@/features/inventory/api/get-inventory";
import { formatDate } from "@/lib/utils";
import type { InventoryTransactionItem } from "@/features/inventory/types";

const typeBadgeColors: Record<string, string> = {
  PURCHASE: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  SALE: "bg-green-100 text-green-800 hover:bg-green-200",
  RETURN: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  ADJUSTMENT: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  DAMAGE: "bg-red-100 text-red-800 hover:bg-red-200",
  TRANSFER: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

const columns: ColumnDef<InventoryTransactionItem>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => row.original.productName ?? "—",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge className={typeBadgeColors[row.original.type] ?? ""}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => row.original.notes ?? "—",
  },
  {
    accessorKey: "referenceType",
    header: "Reference",
    cell: ({ row }) => row.original.referenceType ?? "—",
  },
];

export default function InventoryHistoryPage() {
  const [inventoryId, setInventoryId] = useState("");
  const [params, setParams] = useState<{
    page?: number;
    limit?: number;
    type?: string;
  }>({ page: 1, limit: 20 });

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<InventoryTransactionItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [inventoryId, params]);

  const { data, isLoading, error } = useInventoryTransactions(
    inventoryId,
    params
  );

  const hasActiveFilters = inventoryId.trim() !== "" || !!params.type;

  const handleClearFilters = () => {
    setInventoryId("");
    setParams({ page: 1, limit: 20 });
  };

  if (isLoading) return <AdminTableSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={handleClearFilters} />;

  const transactionData = data?.data?.data ?? [];

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Inventory" },
          { label: "History" },
        ]}
      />
      <AdminPageHeader
        title="Inventory History"
        description="View all inventory transactions"
      />
      <AdminContent className="flex-1">
        <div className="flex-shrink-0 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary-600"
              placeholder="Enter inventory ID..."
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-neutral-600 whitespace-nowrap">Filter by type:</label>
            <Select
              className="w-40"
              size="sm"
              value={params.type ?? ""}
              onValueChange={(val) =>
                setParams((prev) => ({
                  ...prev,
                  type: val || undefined,
                  page: 1,
                }))
              }
              options={[
                { value: "", label: "All Types" },
                { value: "PURCHASE", label: "Purchase" },
                { value: "SALE", label: "Sale" },
                { value: "RETURN", label: "Return" },
                { value: "ADJUSTMENT", label: "Adjustment" },
                { value: "DAMAGE", label: "Damage" },
                { value: "TRANSFER", label: "Transfer" },
              ]}
            />

            <ExportExcelButton
              data={transactionData}
              fetchData={
                inventoryId.trim()
                  ? async () => {
                      const res = await getTransactions(inventoryId, {
                        ...params,
                        page: 1,
                        limit: 10000,
                      });
                      return res?.data?.data ?? [];
                    }
                  : undefined
              }
              filename="inventory_history"
              sheetName="Inventory History"
              columns={EXPORT_PRESETS.inventoryHistory}
            />
          </div>

          {hasActiveFilters && <ClearFiltersButton onClick={handleClearFilters} />}
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          <BulkActionsBar
            selectedCount={selectedRows.length}
            entityName="transaction"
            onClearSelection={() => {
              setSelectedRowIds({});
              setSelectedRows([]);
            }}
            onExport={() => {
              exportToExcel({
                filename: "selected_inventory_history",
                sheetName: "Selected History",
                data: selectedRows,
                columns: EXPORT_PRESETS.inventoryHistory,
              });
            }}
          />

          <DataTable
            columns={columns}
            data={transactionData}
            selectedRowIds={selectedRowIds}
            onRowSelectionChange={(newSelection, items) => {
              setSelectedRowIds(newSelection);
              setSelectedRows(items);
            }}
            getRowId={(row) => String(row.id)}
            className="bg-white border border-neutral-200"
          />
        </div>
      </AdminContent>
    </div>
  );
}
