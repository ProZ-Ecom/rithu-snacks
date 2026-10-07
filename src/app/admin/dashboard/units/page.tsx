"use client";

import { useState, useEffect } from "react";
import {
  useUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from "@/features/units/hooks";
import { getUnits } from "@/features/units/api/get-units";

import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUnitResponse } from "@/features/units/types";
import { UnitForm } from "@/features/units/components/UnitForm";

export default function AdminUnitsPage() {
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] =
    useState<AdminUnitResponse | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<AdminUnitResponse[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useUnits({
      page,
      pageSize,
      search: search || undefined,
    });

  const { data: baseUnitsData } = useUnits({
    page: 1,
    pageSize: 100,
  });

  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();
  const deleteMutation = useDeleteUnit();

  const units = data?.data ?? [];
  const baseUnits = baseUnitsData?.data ?? [];

  const columns: ColumnDef<AdminUnitResponse>[] = [
    {
      accessorKey: "name",
      header: "Unit Name",
      cell: ({ row }) => (
        <p className="font-semibold text-[var(--color-neutral-900)]">
          {row.original.name}
        </p>
      ),
    },

    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-neutral-700)]">
          {row.original.code}
        </span>
      ),
    },

    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize text-[var(--color-neutral-700)]">
          {row.original.type}
        </span>
      ),
    },

    {
      accessorKey: "baseUnitId",
      header: "Base Unit",
      cell: ({ row }) => {
        const baseUnit = units.find(
          (unit) => unit.id === row.original.baseUnitId
        );

        return (
          <span className="text-[var(--color-neutral-700)]">
            {baseUnit
              ? `${baseUnit.name} (${baseUnit.code})`
              : "—"}
          </span>
        );
      },
    },

    {
      accessorKey: "conversionFactor",
      header: "Conversion",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.conversionFactor}
        </span>
      ),
    },

    {
      accessorKey: "sortOrder",
      header: "Order",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.sortOrder}
        </span>
      ),
    },

    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedUnit(row.original);
              setIsEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 text-[var(--color-neutral-500)]" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-[var(--color-error-600)]" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load units"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Unit Management"
        description="Manage product units and their conversion settings."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search units..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={units}
                fetchData={async () => {
                  const res = await getUnits({
                    page: 1,
                    pageSize: 10000,
                    search: search || undefined,
                  });
                  return res.data;
                }}
                totalCount={data?.meta?.total ?? units.length}
                filename="units"
                sheetName="Units"
                columns={EXPORT_PRESETS.units}
              />

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </div>
          </div>

          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="unit"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_units",
                  sheetName: "Selected Units",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.units,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={units}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? Math.max(1, Math.ceil((data?.meta?.total ?? units.length) / pageSize))}
              totalItems={data?.meta?.total ?? units.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              selectedRowIds={selectedRowIds}
              onRowSelectionChange={(newSelection, items) => {
                setSelectedRowIds(newSelection);
                setSelectedRows(items);
              }}
              getRowId={(row) => String(row.id)}
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      {/* CREATE */}
      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Unit"
        description="Create a new product unit"
      >
        <UnitForm
          baseUnits={baseUnits}
          isLoading={createMutation.isPending}
          submitLabel="Create Unit"
          onSubmit={async (formData) => {
            await createMutation.mutateAsync(formData);

            setIsCreateOpen(false);
          }}
        />
      </FormModal>

      {/* EDIT */}
      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUnit(null);
        }}
        title="Update Unit"
        description="Update the selected product unit"
      >
        {selectedUnit && (
          <UnitForm
            initialData={{
              name: selectedUnit.name,
              code: selectedUnit.code,
              type: selectedUnit.type,
              baseUnitId: selectedUnit.baseUnitId,
              conversionFactor: selectedUnit.conversionFactor,
              sortOrder: selectedUnit.sortOrder,
            }}
            baseUnits={baseUnits}
            isEditing
            isLoading={updateMutation.isPending}
            submitLabel="Update Unit"
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({
                uuid: selectedUnit.id,
                data: formData,
              });

              setIsEditOpen(false);
              setSelectedUnit(null);
              refetch();
            }}
          />
        )}
      </FormModal>

      {/* DELETE */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }}
        title="Delete Unit"
        description="Are you sure you want to delete this unit? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}