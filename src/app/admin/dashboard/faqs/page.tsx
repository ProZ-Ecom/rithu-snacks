"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { FormModal } from "@/components/common/FormModal";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  useAdminFaqs,
  useFaqCategories,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq,
  useUpdateFaqStatus,
  useUpdateFaqOrder,
} from "@/features/faqs/hooks";
import { FaqForm } from "@/features/faqs/components";
import type { FaqDto, FaqStatus } from "@/features/faqs/types";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function AdminFaqsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<FaqDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    question: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useAdminFaqs({
    page,
    limit: pageSize,
    search: search || undefined,
    category: categoryFilter || undefined,
    status: (statusFilter || undefined) as FaqStatus | undefined,
    // Reordering swaps neighbours, so the table always reads in display order.
    sortBy: "displayOrder",
    sortOrder: "asc",
  });

  const { data: categories } = useFaqCategories();

  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();
  const deleteMutation = useDeleteFaq();
  const statusMutation = useUpdateFaqStatus();
  const orderMutation = useUpdateFaqOrder();

  const faqs = useMemo(() => data?.data ?? [], [data]);
  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...(categories ?? []).map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [categories]
  );

  const hasActiveFilters =
    search.trim() !== "" || categoryFilter !== "" || statusFilter !== "";

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setPage(1);
  };

  /** New FAQs land at the end of the list by default. */
  const suggestedDisplayOrder = useMemo(() => {
    if (faqs.length === 0) return 0;
    return Math.max(...faqs.map((faq) => faq.displayOrder)) + 1;
  }, [faqs]);

  /**
   * Moving a row swaps its display order with its neighbour on the current
   * page. Both rows are sent in one PATCH so the list can never end up with a
   * half-applied order.
   */
  const handleMove = async (index: number, direction: -1 | 1) => {
    const current = faqs[index];
    const neighbour = faqs[index + direction];
    if (!current || !neighbour) return;

    const currentOrder = current.displayOrder;
    const neighbourOrder = neighbour.displayOrder;

    await orderMutation.mutateAsync({
      items: [
        {
          id: Number(current.id),
          displayOrder:
            neighbourOrder === currentOrder
              ? currentOrder + direction
              : neighbourOrder,
        },
        { id: Number(neighbour.id), displayOrder: currentOrder },
      ],
    });
  };

  const isReorderDisabled =
    orderMutation.isPending || hasActiveFilters || (data?.meta?.total ?? 0) < 2;

  const columns: ColumnDef<FaqDto>[] = [
    {
      accessorKey: "displayOrder",
      header: "Order",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="w-8 text-sm font-semibold text-[var(--color-neutral-900)]">
            {row.original.displayOrder}
          </span>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMove(row.index, -1)}
              disabled={isReorderDisabled || row.index === 0}
              className="h-5 w-5 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]"
              title="Move up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMove(row.index, 1)}
              disabled={isReorderDisabled || row.index === faqs.length - 1}
              className="h-5 w-5 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]"
              title="Move down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "question",
      header: "Question",
      cell: ({ row }) => (
        <div className="min-w-[240px] max-w-[420px]">
          <p className="font-semibold text-[var(--color-neutral-900)]">
            {row.original.question}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-neutral-500)]">
            {row.original.answer}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) =>
        row.original.category ? (
          <span className="inline-flex items-center rounded-md bg-[var(--color-primary-50)] px-2 py-1 text-xs font-medium text-[var(--color-primary-700)] ring-1 ring-inset ring-[var(--color-primary-700)]/10">
            {row.original.category}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-neutral-500)]">
            Uncategorised
          </span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const faq = row.original;
        const isActive = faq.status === "ACTIVE";

        return (
          <div className="flex items-center gap-2.5">
            <Switch
              checked={isActive}
              disabled={statusMutation.isPending}
              onCheckedChange={(checked) =>
                statusMutation.mutate({
                  id: faq.id,
                  data: { status: checked ? "ACTIVE" : "INACTIVE" },
                })
              }
            />
            <Badge
              variant={isActive ? "success" : "secondary"}
              className="text-xs"
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const faq = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedFaq(faq);
                setIsEditOpen(true);
              }}
              className="h-8 w-8 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]"
              title="Edit FAQ"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setDeleteTarget({ id: faq.id, question: faq.question })
              }
              className="h-8 w-8 text-[var(--color-error-500)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)]"
              title="Delete FAQ"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return <ErrorState message="Failed to load FAQs" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="FAQs"
        description="Manage the questions and answers shown on the storefront FAQ page."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-2xl bg-[var(--color-background)] py-1">
          {/* Top Bar: Search, Filters, Add Button */}
          <div className="flex flex-shrink-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                placeholder="Search questions or answers..."
                value={search}
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                className="w-full max-w-md"
              />

              <div className="w-full sm:w-52">
                <Select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  options={categoryOptions}
                  placeholder="All Categories"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  options={STATUS_FILTER_OPTIONS}
                  placeholder="All Statuses"
                  className="h-11 rounded-xl"
                />
              </div>

              {hasActiveFilters && (
                <ClearFiltersButton onClick={handleClearFilters} />
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={faqs}
                filename="faqs"
                sheetName="FAQs"
                columns={EXPORT_PRESETS.faqs}
              />

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add FAQ
              </Button>
            </div>
          </div>

          {hasActiveFilters && (
            <p className="mt-3 flex-shrink-0 text-xs text-[var(--color-neutral-500)]">
              Clear the filters to reorder FAQs.
            </p>
          )}

          {/* Data Table */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <DataTable
              columns={columns}
              data={faqs}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={
                data?.meta?.totalPages ??
                Math.max(
                  1,
                  Math.ceil((data?.meta?.total ?? faqs.length) / pageSize)
                )
              }
              totalItems={data?.meta?.total ?? faqs.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      {/* CREATE MODAL */}
      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New FAQ"
        description="Write the question and answer customers will see on the FAQ page."
        size="lg"
      >
        <FaqForm
          categories={categories ?? []}
          suggestedDisplayOrder={suggestedDisplayOrder}
          isLoading={createMutation.isPending}
          submitLabel="Save FAQ"
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={async (formData) => {
            await createMutation.mutateAsync(formData);
            setIsCreateOpen(false);
          }}
        />
      </FormModal>

      {/* EDIT MODAL */}
      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedFaq(null);
        }}
        title="Edit FAQ"
        description="Update the question, answer, category, order or status."
        size="lg"
      >
        {selectedFaq && (
          <FaqForm
            initialData={selectedFaq}
            categories={categories ?? []}
            isLoading={updateMutation.isPending}
            submitLabel="Update FAQ"
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedFaq(null);
            }}
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({
                id: selectedFaq.id,
                data: formData,
              });
              setIsEditOpen(false);
              setSelectedFaq(null);
            }}
          />
        )}
      </FormModal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete FAQ"
        description={`Are you sure you want to permanently delete "${deleteTarget?.question}"? This action cannot be undone.`}
        confirmText="Delete FAQ"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
