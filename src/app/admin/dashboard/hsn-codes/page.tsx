"use client";

import { useState, useEffect } from "react";
import {
  useHsnCodes,
  useCreateHsnCode,
  useUpdateHsnCode,
  useDeleteHsnCode,
} from "@/features/hsn-codes/hooks";
import { getHsnCodes } from "@/features/hsn-codes/api/get-hsn-codes";
import { useGstRates } from "@/features/gst-rates/hooks/use-gst-rates";
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
import type { AdminHsnCodeResponse } from "@/features/hsn-codes/types";
import { HsnCodeForm } from "@/features/hsn-codes/components/HsnCodeForm";

export default function AdminHsnCodesPage() {
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHsn, setSelectedHsn] =
    useState<AdminHsnCodeResponse | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<AdminHsnCodeResponse[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useHsnCodes({
  page,
  pageSize,
  search: search || undefined,
});

  const { data: gstData } = useGstRates({ pageSize: 100 });

  const createMutation = useCreateHsnCode();
  const updateMutation = useUpdateHsnCode();
  const deleteMutation = useDeleteHsnCode();

  const hsnCodes = data?.data ?? [];

  const gstMap = new Map(
    (gstData?.data ?? []).map((gst) => [gst.id, gst])
  );

  const columns: ColumnDef<AdminHsnCodeResponse>[] = [
    {
      accessorKey: "code",
      header: "HSN Code",
      cell: ({ row }) => (
        <p className="font-semibold text-[var(--color-neutral-900)]">
          {row.original.code}
        </p>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "gstRateId",
      header: "GST Rate",
      cell: ({ row }) => {
        const gst = gstMap.get(row.original.gstRateId || "");
        return (
          <span className="text-[var(--color-neutral-700)]">
            {gst ? `${gst.name}` : "-"}
          </span>
        );
      },
    },
    // {
    //   accessorKey: "createdAt",
    //   header: "Created Date",
    //   cell: ({ row }) => (
    //     <span className="text-[var(--color-neutral-700)]">
    //       {new Date(row.original.createdAt).toLocaleDateString("en-IN")}
    //     </span>
    //   ),
    // },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedHsn(row.original);
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
        message="Failed to load HSN codes"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="HSN Code Management"
        description="Manage HSN codes and GST mappings."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search HSN codes..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={hsnCodes}
                fetchData={async () => {
                  const res = await getHsnCodes({
                    page: 1,
                    pageSize: 10000,
                    search: search || undefined,
                  });
                  return res.data;
                }}
                totalCount={data?.meta?.total ?? hsnCodes.length}
                filename="hsn_codes"
                sheetName="HSN Codes"
                columns={EXPORT_PRESETS.hsnCodes}
              />

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add HSN Code
              </Button>
            </div>
          </div>

          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="HSN code"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_hsn_codes",
                  sheetName: "Selected HSN Codes",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.hsnCodes,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={hsnCodes}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? Math.max(1, Math.ceil((data?.meta?.total ?? hsnCodes.length) / pageSize))}
              totalItems={data?.meta?.total ?? hsnCodes.length}
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

      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add HSN Code"
        description="Create a new HSN code"
      >
        <HsnCodeForm
          isLoading={createMutation.isPending}
          submitLabel="Create HSN Code"
          onSubmit={async (formData) => {
            await createMutation.mutateAsync({
              code: formData.code,
              description: formData.description || null,
              gstRateId: formData.gstRateId,
            });
            setIsCreateOpen(false);
          }}
        />
      </FormModal>

      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedHsn(null);
        }}
        title="Update HSN Code"
        description="Update the selected HSN code"
      >
        {selectedHsn && (
          <HsnCodeForm
            initialData={{
              code: selectedHsn.code,
              description: selectedHsn.description ?? "",
              gstRateId: selectedHsn.gstRateId ?? "",
            }}
            isEditing
            isLoading={updateMutation.isPending}
            submitLabel="Update HSN Code"
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({
                uuid: selectedHsn.id,
                data: {
                  code: formData.code,
                  description: formData.description || null,
                  gstRateId: formData.gstRateId,
                },
              });

              setIsEditOpen(false);
              setSelectedHsn(null);
              refetch();
            }}
          />
        )}
      </FormModal>

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
        title="Delete HSN Code"
        description="Are you sure you want to delete this HSN code? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}