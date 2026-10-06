"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  usePermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from "@/features/roles/hooks";
import { DataTable } from "@/components/admin/data-table/DataTable";
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
import { toast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createPermissionSchema,
  type CreatePermissionSchemaInput,
} from "@/features/roles/validations/role.schema";
import type { ColumnDef } from "@tanstack/react-table";
import type { PermissionListItem } from "@/features/roles/types";

export default function AdminPermissionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionListItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: permissionsData, isLoading, error, refetch } = usePermissions();
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const deleteMutation = useDeletePermission();

  const permissions = permissionsData ?? [];

  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return permissions;
    const q = search.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [permissions, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const paginatedPermissions = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredPermissions.slice(startIndex, startIndex + pageSize);
  }, [filteredPermissions, page, pageSize]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePermissionSchemaInput>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      name: "",
      module: "",
      description: "",
    },
  });

  useEffect(() => {
    if (editingPermission) {
      reset({
        name: editingPermission.name,
        module: editingPermission.module,
        description: editingPermission.description ?? "",
      });
    } else {
      reset({ name: "", module: "", description: "" });
    }
  }, [editingPermission, reset]);

  const onSubmit = (formData: CreatePermissionSchemaInput) => {
    if (editingPermission) {
      updateMutation.mutate(
        { id: editingPermission.id, data: formData },
        {
          onSuccess: () => {
            toast.success("Permission Updated", "Permission updated successfully.");
            setModalOpen(false);
            setEditingPermission(null);
          },
          onError: (err: any) => {
            toast.error("Update Failed", err?.message || "Could not update permission.");
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Permission Created", "Permission created successfully.");
          setModalOpen(false);
          reset();
        },
        onError: (err: any) => {
          toast.error("Creation Failed", err?.message || "Could not create permission.");
        },
      });
    }
  };

  const handleOpenModal = (permission?: PermissionListItem) => {
    if (permission) {
      setEditingPermission(permission);
    } else {
      setEditingPermission(null);
    }
    setModalOpen(true);
  };

  const columns: ColumnDef<PermissionListItem, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <p className="font-semibold text-[var(--color-neutral-900)]">
          {row.original.name}
        </p>
      ),
    },
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ row }) => <Badge variant="info">{row.original.module}</Badge>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.description || "—"}
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
            title="Edit Permission"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Delete Permission"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && !permissionsData) return <AdminTableSkeleton />;
  if (error) return <ErrorState message="Failed to load permissions" onRetry={() => refetch()} />;

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Permission Management"
        description="Manage granular permissions for system roles."
      />
      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Search + Add Button Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search permissions..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={paginatedPermissions}
                filename="permissions"
                sheetName="Permissions"
                columns={EXPORT_PRESETS.permissions}
              />

              <Button
                type="button"
                onClick={() => handleOpenModal()}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Permission
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <DataTable
              columns={columns}
              data={paginatedPermissions}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={page}
              totalPages={totalPages}
              totalItems={filteredPermissions.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              emptyMessage={
                search
                  ? "No permissions match your search."
                  : "No permissions created yet."
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
          setEditingPermission(null);
        }}
        title={editingPermission ? "Edit Permission" : "Add Permission"}
        description={
          editingPermission
            ? "Update permission details"
            : "Create a new permission"
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditingPermission(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isMutating}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {isMutating ? "Saving..." : editingPermission ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("name")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.name
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Enter permission name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module <span className="text-rose-500">*</span>
            </label>
            <input
              {...register("module")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.module
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Enter module name"
            />
            {errors.module && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.module.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.description
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                  : "border-gray-300 focus:border-primary focus:ring-primary/30"
              }`}
              placeholder="Permission description"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.description.message}</p>
            )}
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
                toast.success("Permission Deleted", "Permission removed successfully.");
                setDeleteId(null);
              },
              onError: (err: any) => {
                toast.error("Delete Failed", err?.message || "Could not delete permission.");
              },
            });
          }
        }}
        title="Delete Permission"
        description="Are you sure you want to delete this permission? Roles using it will lose access."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
