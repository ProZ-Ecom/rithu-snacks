"use client";

import React, { useState, useEffect } from "react";
import { FormModal } from "@/components/common/FormModal";
import { CategoryForm } from "@/features/categories/components/CategoryForm";
import Image from "next/image";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
import { StatsCard } from "@/components/admin/StatsCard";
import { Grid3X3, CheckCircle2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCategories,
  useDeleteCategory,
  useBulkDeleteCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/features/categories/hooks";
import { getCategories } from "@/features/categories/api/get-categories";
import { getImageUrl } from "@/lib/utils";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { toast } from "@/components/ui/Toast";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { CategoryListItem } from "@/features/categories/types";

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryListItem | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<CategoryListItem[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Clear selections when filter/search/page changes
  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useCategories({
    page,
    pageSize,
    search: search || undefined,
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const bulkDeleteMutation = useBulkDeleteCategories();

  const categories = data?.success && data.data ? data.data : [];

  const parentCategoryOptions = categories.map((category) => ({
    value: category.id.toString(),
    label: category.name,
  }));

  const columns: ColumnDef<CategoryListItem, unknown>[] = [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <div className="h-12 w-12 overflow-hidden rounded-xl bg-[var(--color-neutral-100)]">
          <Image
            src={
              row.original.icon
                ? getImageUrl(row.original.icon)
                : "/images/category_img.png"
            }
            alt={row.original.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Category Name",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[var(--color-neutral-900)]">{row.original.name}</p>
        </div>
      ),
    },

    {
      accessorKey: "slug",
      header: "Category Code",
      cell: ({ row }) => (
        <div>
          <p className="mt-1 text-sm text-[var(--color-neutral-500)]">{row.original.slug}</p>
        </div>
      ),
    },

    // {
    //   accessorKey: "_count.products",
    //   header: "Products",
    //   cell: ({ row }) => (
    //     <span className="text-[var(--color-neutral-700)]">
    //       {row.original._count?.products || 0} Items
    //     </span>
    //   ),
    // },
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
      accessorKey: "sortOrder",
      header: "Sort Order",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">{row.original.sortOrder}</span>
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
              setSelectedCategory(row.original);
              setIsEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 text-[var(--color-neutral-500)]" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}>
            <Trash2 className="h-4 w-4 text-[var(--color-error-600)]" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }
  if (error) return <ErrorState message="Failed to load categories" onRetry={() => refetch()} />;

  const totalCategories = categories.length;

  const activeCategories = categories.filter((category) => category.isActive).length;

  const totalProducts = categories.reduce(
    (sum, category) => sum + (category._count?.products || 0),
    0
  );

  const mostPopular =
    categories.length > 0
      ? categories.reduce((prev, current) =>
          (current._count?.products || 0) > (prev._count?.products || 0) ? current : prev
        )
      : null;

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col">
      {/* <AdminBreadcrumb items={[{ label: "Categories" }]} /> */}
      <AdminPageHeader
        title="Categories"
        description="Manage your product categories"
      />
      <AdminContent className="flex-1 min-h-0 min-w-0">
        <div className="flex flex-1 min-h-0 min-w-0 flex-col bg-[var(--color-background)] rounded-2xl">
          {/* Search + Filter */}
          <div className="flex-shrink-0 mt-3 sm:mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search categories..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={categories}
                fetchData={async () => {
                  const res = await getCategories({
                    page: 1,
                    pageSize: 10000,
                    search: search || undefined,
                  });
                  return res.data;
                }}
                totalCount={data?.meta?.total ?? categories.length}
                filename="categories"
                sheetName="Categories"
                columns={EXPORT_PRESETS.categories}
              />

              <Button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-3 sm:mt-5 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="category"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_categories",
                  sheetName: "Selected Categories",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.categories,
                });
              }}
              onDelete={() => setIsBulkDeleteOpen(true)}
              isDeleting={bulkDeleteMutation.isPending}
            />

            <DataTable
              columns={columns}
              data={categories}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? Math.max(1, Math.ceil((data?.meta?.total ?? categories.length) / pageSize))}
              totalItems={data?.meta?.total ?? categories.length}
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                toast.success("Category Deleted", "Category removed successfully.");
                setDeleteId(null);
              },
              onError: (err: any) => {
                toast.error("Delete Failed", err.message || "Could not delete category.");
              },
            });
          }
        }}
        title="Delete Category"
        description="Are you sure you want to delete this category? Deleting this category will automatically deactivate and remove all associated products and items from both the admin dashboard and the customer storefront. This action cannot be undone."
        confirmText="Delete Category"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={async () => {
          const idsToDelete = selectedRows
            .map((r: any) => r.uuid || r.id)
            .filter((id): id is string | number => Boolean(id));
          if (idsToDelete.length === 0) return;
          try {
            await bulkDeleteMutation.mutateAsync(idsToDelete);

            toast.success(
              "Categories Deleted",
              `Successfully deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? "category" : "categories"}.`
            );
            setSelectedRowIds({});
            setSelectedRows([]);
            setIsBulkDeleteOpen(false);
            refetch();
          } catch (err: any) {
            toast.error("Delete Failed", err.message || "Could not delete selected categories.");
          }
        }}
        title={`Delete ${selectedRows.length} Selected ${selectedRows.length === 1 ? "Category" : "Categories"}`}
        description={`Are you sure you want to delete ${selectedRows.length} selected ${selectedRows.length === 1 ? "category" : "categories"}${search ? ` matching "${search}"` : ""}? Deleting will automatically deactivate and remove all associated products and items from both the admin dashboard and storefront. This action cannot be undone.`}
        confirmText={`Delete ${selectedRows.length} ${selectedRows.length === 1 ? "Category" : "Categories"}`}
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
      />

      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Category"
        description="Create a new product category"
      >
        <CategoryForm
          parentCategories={parentCategoryOptions}
          isLoading={createMutation.isPending}
          submitLabel="Create Category"
          onSubmit={async (data) => {
            const payload = {
              name: data.name,
              slug: data.slug,
              description: data.description,
              icon: data.image,
              sortOrder: Number(data.sortOrder),
            };

            console.log("Create payload:", payload);

            await createMutation.mutateAsync(payload);

            setIsCreateOpen(false);
            refetch();
          }}
        />
      </FormModal>

      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedCategory(null);
        }}
        title="Update Category"
        description="Update the selected category"
      >
        {selectedCategory && (
          <CategoryForm
            initialData={{
              name: selectedCategory.name,
              slug: selectedCategory.slug,
              description: selectedCategory.description,
              image: selectedCategory.icon,
              isActive: selectedCategory.isActive,
              sortOrder: selectedCategory.sortOrder,
            }}
            isEditing
            parentCategories={parentCategoryOptions}
            isLoading={updateMutation.isPending}
            submitLabel="Update Category"
            onSubmit={async (data) => {
              const payload = {
                name: data.name,
                slug: data.slug,
                description: data.description,
                icon: data.image,
                sortOrder: Number(data.sortOrder),
              };

              await updateMutation.mutateAsync({
                id: selectedCategory.id,
                data: payload,
              });

              setIsEditOpen(false);
              setSelectedCategory(null);
              refetch();
            }}
          />
        )}
      </FormModal>
    </div>
  );
}
