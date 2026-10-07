"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from "@/features/brands/hooks";
import { getBrands } from "@/features/brands/api/get-brands";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
// import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BrandListItem } from "@/features/brands/types";
import { BrandForm } from "@/features/brands/components/BrandForm";
import { SearchInput } from "@/components/ui/search-input";

export default function AdminBrandsPage() {
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandListItem | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<BrandListItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useBrands({
    page,
    limit: pageSize,
    search: search || undefined,
  });

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const brands = data?.data ?? [];

  const columns: ColumnDef<BrandListItem, unknown>[] = [
  // {
  //   id: "logo",
  //   header: "Logo",
  //   cell: ({ row }) => (
  //     <div className="h-12 w-12 overflow-hidden rounded-xl bg-[var(--color-neutral-100)]">
  //       <Image
  //         src={row.original.icon || "/images/category_img.png"}
  //         alt={row.original.name}
  //         width={48}
  //         height={48}
  //         className="h-full w-full object-cover"
  //       />
  //     </div>
  //   ),
  // },
  {
    accessorKey: "name",
    header: "Brand Name",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-[var(--color-neutral-900)]">
          {row.original.name}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "slug",
    header: "Brand Code",
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-[var(--color-neutral-600)]">
          {row.original.slug || "—"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "_count.products",
    header: "Products",
    cell: ({ row }) => (
      <span className="text-[var(--color-neutral-700)]">
        {row.original._count?.products || 0} Items
      </span>
    ),
  },
  // {
  //   accessorKey: "isActive",
  //   header: "Status",
  //   cell: ({ row }) =>
  //     row.original.isActive ? (
  //       <span className="inline-flex items-center rounded-full bg-[var(--color-success-50)] px-3 py-1 text-xs font-medium text-[var(--color-success-700)]">
  //         Active
  //       </span>
  //     ) : (
  //       <span className="inline-flex items-center rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-xs font-medium text-[var(--color-neutral-600)]">
  //         Inactive
  //       </span>
  //     ),
  // },
  {
    accessorKey: "createdAt",
    header: "Created Date",
    cell: ({ row }) => (
      <span className="text-[var(--color-neutral-700)]">
        {new Date(row.original.createdAt).toLocaleDateString("en-IN")}
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
            setSelectedBrand(row.original);
            setIsEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4 text-[var(--color-neutral-500)]" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteId(row.original.uuid)}
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
  if (error) return <ErrorState message="Failed to load brands" onRetry={() => refetch()} />;

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col">
      {/* <AdminBreadcrumb items={[{ label: "Brands" }]} /> */}
      <AdminPageHeader
        title="Brand Management"
        description="Manage product brands and their associated catalogs."
      />
      
      <AdminContent className="flex-1 min-h-0 min-w-0">
        <div className="flex flex-1 min-h-0 min-w-0 flex-col bg-[var(--color-background)] py-1 rounded-2xl">

          {/* Search + Filter */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search brands..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={brands}
                fetchData={async () => {
                  const res = await getBrands({
                    page: 1,
                    limit: 10000,
                    search: search || undefined,
                  });
                  return res.data;
                }}
                totalCount={data?.meta?.total ?? brands.length}
                filename="brands"
                sheetName="Brands"
                columns={EXPORT_PRESETS.brands}
              />

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Brand
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 sm:mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="brand"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_brands",
                  sheetName: "Selected Brands",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.brands,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={brands}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? Math.max(1, Math.ceil((data?.meta?.total ?? brands.length) / pageSize))}
              totalItems={data?.meta?.total ?? brands.length}
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
              getRowId={(row) => String(row.id || row.uuid)}
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      <FormModal
  open={isCreateOpen}
  onClose={() => setIsCreateOpen(false)}
  title="Add Brand"
  description="Create a new product brand"
>
  <BrandForm
    isLoading={createMutation.isPending}
    submitLabel="Create Brand"
    onSubmit={async (data) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
      };

      await createMutation.mutateAsync(payload);

      setIsCreateOpen(false);
    }}
  />
</FormModal>  

<FormModal
  open={isEditOpen}
  onClose={() => {
    setIsEditOpen(false);
    setSelectedBrand(null);
  }}
  title="Update Brand"
  description="Update the selected brand"
>
  {selectedBrand && (
    <BrandForm
      initialData={{
        name: selectedBrand.name,
        slug: selectedBrand.slug,
        description: selectedBrand.description,
        
      }}
      isEditing
      isLoading={updateMutation.isPending}
      submitLabel="Update Brand"
      onSubmit={async (data) => {
        const payload = {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
         
        };

        await updateMutation.mutateAsync({
          uuid: selectedBrand.uuid,
          data: payload,
        });

        setIsEditOpen(false);
        setSelectedBrand(null);
        refetch();
      }}
    />
  )}
</FormModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) 

            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }
        title="Delete Brand"
        description="Are you sure you want to delete this brand? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
