"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBlogs, useCreateBlog, useUpdateBlog, useDeleteBlog, getBlogs } from "@/features/blogs/hooks";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { exportToExcel } from "@/lib/excel-export";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { createBlogSchema, type CreateBlogSchemaInput } from "@/features/blogs/validations/blog.schema";
import type { ColumnDef } from "@tanstack/react-table";
import type { BlogListItem } from "@/features/blogs/types";

const statusBadgeVariant: Record<string, "secondary" | "success" | "warning"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

export default function AdminBlogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogListItem | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<BlogListItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data, isLoading, error, refetch } = useBlogs({
    page,
    limit: pageSize,
    search: search || undefined,
  });

  const createMutation = useCreateBlog();
  const updateMutation = useUpdateBlog();
  const deleteMutation = useDeleteBlog();

  const blogs = data?.data ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBlogSchemaInput>({
    resolver: zodResolver(createBlogSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      image: "",
      status: "DRAFT",
      metaTitle: "",
      metaDescription: "",
    },
  });

  const watchTitle = watch("title");

  useEffect(() => {
    if (editingBlog) {
      reset({
        title: editingBlog.title,
        content: editingBlog.content,
        excerpt: editingBlog.excerpt ?? "",
        image: editingBlog.image ?? "",
        status: editingBlog.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        metaTitle: editingBlog.metaTitle ?? "",
        metaDescription: editingBlog.metaDescription ?? "",
      });
    } else {
      reset({ title: "", content: "", excerpt: "", image: "", status: "DRAFT", metaTitle: "", metaDescription: "" });
    }
  }, [editingBlog, reset]);

  const onSubmit = (formData: CreateBlogSchemaInput) => {
    if (editingBlog) {
      updateMutation.mutate(
        { id: editingBlog.id, data: formData },
        {
          onSuccess: () => {
            toast.success("Blog Updated", "Blog post updated successfully.");
            setModalOpen(false);
            setEditingBlog(null);
          },
          onError: (err: any) => {
            toast.error("Update Failed", err?.message || "Could not update blog post.");
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Blog Created", "Blog post created successfully.");
          setModalOpen(false);
          reset();
        },
        onError: (err: any) => {
          toast.error("Creation Failed", err?.message || "Could not create blog post.");
        },
      });
    }
  };

  const handleOpenModal = (blog?: BlogListItem) => {
    if (blog) {
      setEditingBlog(blog);
    } else {
      setEditingBlog(null);
    }
    setModalOpen(true);
  };

  const columns: ColumnDef<BlogListItem, unknown>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[var(--color-neutral-900)]">{row.original.title}</p>
          <p className="text-xs text-[var(--color-neutral-500)]">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: "author",
      header: "Author",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.author?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant[row.original.status] ?? "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "publishedAt",
      header: "Published Date",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.publishedAt
            ? new Date(row.original.publishedAt).toLocaleDateString("en-IN")
            : "—"}
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
            onClick={() => handleOpenModal(row.original)}
            className="h-8 w-8 text-neutral-500 hover:text-secondary-700 hover:bg-secondary-50 cursor-pointer"
            title="Edit Blog"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Delete Blog"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && !data) return <AdminTableSkeleton />;
  if (error) return <ErrorState message="Failed to load blogs" onRetry={() => refetch()} />;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Blog Management"
        description="Manage your blog posts, articles, and SEO metadata."
      />
      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Search + Add Button Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search blogs..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={blogs}
                fetchData={async () => {
                  const res = await getBlogs({
                    page: 1,
                    limit: 10000,
                    search: search.trim() || undefined,
                  });
                  return res?.data ?? [];
                }}
                totalCount={data?.meta?.total ?? blogs.length}
                filename="blogs"
                sheetName="Blogs"
                columns={EXPORT_PRESETS.blogs}
              />

              <Button
                type="button"
                onClick={() => handleOpenModal()}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Blog
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="blogs"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_blogs",
                  sheetName: "Selected Blogs",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.blogs,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={blogs}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={
                data?.meta?.totalPages ??
                Math.max(1, Math.ceil((data?.meta?.total ?? blogs.length) / pageSize))
              }
              totalItems={data?.meta?.total ?? blogs.length}
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
              emptyMessage={
                search
                  ? "No blogs match your search."
                  : "No blogs created yet."
              }
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBlog(null);
        }}
        title={editingBlog ? "Edit Blog" : "Add Blog"}
        description={editingBlog ? "Update blog details" : "Create a new blog post"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditingBlog(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingBlog
                ? "Update"
                : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("title")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.title
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Blog title"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              readOnly
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-neutral-600"
              placeholder="auto-generated-from-title"
              value={slugify(watchTitle || "")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              {...register("content")}
              rows={6}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.content
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Blog content"
            />
            {errors.content && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.content.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea
              {...register("excerpt")}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Short excerpt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              {...register("image")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="https://example.com/image.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={watch("status")}
              onValueChange={(val) =>
                setValue("status", val as "DRAFT" | "PUBLISHED" | "ARCHIVED", { shouldValidate: true })
              }
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
              error={!!errors.status}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
            <input
              {...register("metaTitle")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="SEO meta title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <textarea
              {...register("metaDescription")}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="SEO meta description"
            />
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                toast.success("Blog Deleted", "Blog post removed successfully.");
                setDeleteId(null);
              },
              onError: (err: any) => {
                toast.error("Delete Failed", err?.message || "Could not delete blog post.");
              },
            });
          }
        }}
        title="Delete Blog"
        description="Are you sure you want to delete this blog post? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
