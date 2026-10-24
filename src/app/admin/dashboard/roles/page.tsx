"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissions,
} from "@/features/roles/hooks";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { exportToExcel } from "@/lib/excel-export";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormModal } from "@/components/common/FormModal";
import { toast } from "@/components/ui/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createRoleSchema,
  type CreateRoleSchemaInput,
} from "@/features/roles/validations/role.schema";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoleListItem } from "@/features/roles/types";

export default function AdminRolesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<RoleListItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, page, pageSize]);

  const { data: rolesData, isLoading: rolesLoading, error: rolesError, refetch } = useRoles();
  const { data: permissions } = usePermissions();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const roles = rolesData ?? [];

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const paginatedRoles = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredRoles.slice(startIndex, startIndex + pageSize);
  }, [filteredRoles, page, pageSize]);

  const permissionsByModule = useMemo(() => {
    if (!permissions) return {};
    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    }
    return grouped;
  }, [permissions]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleSchemaInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (editingRole) {
      reset({
        name: editingRole.name,
        description: editingRole.description ?? "",
      });
    } else {
      reset({ name: "", description: "" });
    }
  }, [editingRole, reset]);

  const handleTogglePermission = (permId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const onSubmit = (formData: CreateRoleSchemaInput) => {
    const payload = { ...formData, permissionIds: selectedPermissionIds };

    if (editingRole) {
      updateMutation.mutate(
        { id: editingRole.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Role Updated", "Role updated successfully.");
            setModalOpen(false);
            setEditingRole(null);
            setSelectedPermissionIds([]);
          },
          onError: (err: any) => {
            toast.error("Update Failed", err?.message || "Could not update role.");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Role Created", "Role created successfully.");
          setModalOpen(false);
          reset();
          setSelectedPermissionIds([]);
        },
        onError: (err: any) => {
          toast.error("Creation Failed", err?.message || "Could not create role.");
        },
      });
    }
  };

  const handleOpenModal = (role?: RoleListItem) => {
    if (role) {
      setEditingRole(role);
    } else {
      setEditingRole(null);
    }
    setSelectedPermissionIds([]);
    setModalOpen(true);
  };

  const columns: ColumnDef<RoleListItem, unknown>[] = [
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
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)]">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "_count.users",
      header: "Users",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)] font-medium">
          {row.original._count?.users ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "_count.rolePermissions",
      header: "Permissions",
      cell: ({ row }) => (
        <span className="text-[var(--color-neutral-700)] font-medium">
          {row.original._count?.rolePermissions ?? 0}
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
            title="Edit Role"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
            title="Delete Role"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (rolesLoading && !rolesData) return <AdminTableSkeleton />;
  if (rolesError) return <ErrorState message="Failed to load roles" onRetry={() => refetch()} />;

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Role Management"
        description="Manage user roles and their assigned permissions."
      />
      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Search + Add Button Header */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchInput
              placeholder="Search roles..."
              defaultValue={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full max-w-md"
            />

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={filteredRoles}
                totalCount={filteredRoles.length}
                filename="roles"
                sheetName="Roles"
                columns={EXPORT_PRESETS.roles}
              />

              <Button
                type="button"
                onClick={() => handleOpenModal()}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="roles"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_roles",
                  sheetName: "Selected Roles",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.roles,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={paginatedRoles}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={page}
              totalPages={totalPages}
              totalItems={filteredRoles.length}
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
                  ? "No roles match your search."
                  : "No roles created yet."
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
          setEditingRole(null);
          setSelectedPermissionIds([]);
        }}
        title={editingRole ? "Edit Role" : "Add Role"}
        description={editingRole ? "Update role details and permissions" : "Create a new role"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditingRole(null);
                setSelectedPermissionIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isMutating}
              className="bg-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-700)] text-white"
            >
              {isMutating ? "Saving..." : editingRole ? "Update" : "Create"}
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
              placeholder="Role name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name.message}</p>
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
              placeholder="Role description"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-4 space-y-4">
              {Object.keys(permissionsByModule).length === 0 && (
                <p className="text-sm text-muted-foreground">No permissions available</p>
              )}
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                    {module}
                  </p>
                  <div className="space-y-1">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer rounded p-1 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissionIds.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="h-4 w-4 rounded border-gray-300 text-secondary-600 focus:ring-secondary-500"
                        />
                        <span className="text-sm font-medium text-neutral-800">{perm.name}</span>
                        {perm.description && (
                          <span className="text-xs text-muted-foreground">
                            - {perm.description}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                toast.success("Role Deleted", "Role removed successfully.");
                setDeleteId(null);
              },
              onError: (err: any) => {
                toast.error("Delete Failed", err?.message || "Could not delete role.");
              },
            });
          }
        }}
        title="Delete Role"
        description="Are you sure you want to delete this role? Users with this role will lose their permissions."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
