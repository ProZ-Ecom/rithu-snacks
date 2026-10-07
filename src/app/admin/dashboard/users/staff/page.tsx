"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { exportToExcel } from "@/lib/excel-export";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { StatsCard } from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { useStaffList, useStaffCount, getStaffList, StaffFormModal } from "@/features/staff";
import type { StaffResponse } from "@/features/staff/types";

export default function AdminStaffPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<StaffResponse | null>(null);

  const [selectedRowIds, setSelectedRowIds] = React.useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = React.useState<StaffResponse[]>([]);

  React.useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, statusFilter, page, pageSize]);

  // Map statusFilter to boolean or undefined
  const isActiveParam =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const queryParams = React.useMemo(() => {
    return {
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      isActive: isActiveParam,
      sortBy: "name" as const,
      sortOrder: "asc" as const,
    };
  }, [page, pageSize, search, isActiveParam]);

  const { data, isLoading, error, refetch } = useStaffList(queryParams);

  // Real backend staff count API query
  const { data: countData, isLoading: isCountLoading } = useStaffCount({
    search: search.trim() || undefined,
  });

  const staffList = data?.data ?? [];
  const meta = data?.meta;

  const totalItems = meta?.total !== undefined ? meta.total : staffList.length;
  const totalPages =
    meta?.totalPages !== undefined && meta.totalPages > 0
      ? meta.totalPages
      : Math.max(1, Math.ceil(totalItems / pageSize));

  const totalCount = countData?.all ?? totalItems;
  const activeCount = countData?.active ?? staffList.filter((s) => s.isActive).length;
  const inactiveCount = countData?.inactive ?? staffList.filter((s) => !s.isActive).length;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  const handleOpenCreateModal = () => {
    setSelectedStaff(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffResponse) => {
    setSelectedStaff(staff);
    setIsFormModalOpen(true);
  };

  const columns = React.useMemo<ColumnDef<StaffResponse>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff Member",
        cell: ({ row }) => {
          const staff = row.original;
          const initials = staff.name
            ? staff.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "ST";

          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 font-semibold text-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 truncate">
                    {staff.name}
                  </p>
                  <span className="inline-flex items-center rounded-md bg-secondary-50 px-2 py-0.5 text-[11px] font-medium text-secondary-700 border border-secondary-200/60">
                    {staff.role || "STAFF"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate sm:hidden">
                  {staff.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email Address",
        cell: ({ row }) => (
          <span className="text-sm text-neutral-700 font-medium">
            {row.original.email || "—"}
          </span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        cell: ({ row }) => {
          const rawPhone = row.original.phone;
          const displayPhone = rawPhone
            ? rawPhone.replace(/^\+91\s*/, "").replace(/^91\s*/, "").trim()
            : "";

          return (
            <span className="text-sm text-neutral-600">
              {displayPhone || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.isActive;
          return isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 border border-neutral-200">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Inactive
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        cell: ({ row }) => {
          const dateVal = row.original.createdAt;
          if (!dateVal) return <span className="text-neutral-400">—</span>;
          const formatted = new Date(dateVal).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return <span className="text-sm text-neutral-600">{formatted}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const staff = row.original;
          return (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEditModal(staff)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-secondary-700 bg-secondary-50 hover:bg-secondary-100 transition-colors border border-secondary-200/60 cursor-pointer"
                title="Edit staff member"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">

      <AdminPageHeader
        title="Staff Management"
        description="View, search, create, and manage staff members with system access."
      />

      {/* KPI Summary Cards powered by Staff Count API */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-shrink-0 mt-4">
        <StatsCard
          title="Total Staff"
          value={isCountLoading ? "—" : totalCount}
          icon={Users}
          description="Total registered staff accounts"
        />
        <StatsCard
          title="Active Staff"
          value={isCountLoading ? "—" : activeCount}
          icon={UserCheck}
          description="Currently active staff members"
        />
        <StatsCard
          title="Inactive Staff"
          value={isCountLoading ? "—" : inactiveCount}
          icon={UserX}
          description="Deactivated or suspended accounts"
        />
      </div>

      {/* Filter Toolbar: Search Input + Status Dropdown + Reset on Left, Create Staff Button on Right */}
      <div className="flex-shrink-0 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput
            placeholder="Search staff by name, email, or phone..."
            value={search}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            className="w-full sm:max-w-xs md:max-w-md"
          />

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active Staff" },
                { value: "inactive", label: "Inactive Staff" },
              ]}
              placeholder="Filter by Status"
              className="h-10 rounded-xl text-xs font-medium"
            />
          </div>

          {hasActiveFilters && (
            <ClearFiltersButton onClick={handleResetFilters} />
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <ExportExcelButton
            data={staffList}
            fetchData={async () => {
              const res = await getStaffList({
                ...queryParams,
                page: 1,
                limit: 10000,
              });
              return res?.data ?? [];
            }}
            totalCount={totalCount}
            filename="staff_members"
            sheetName="Staff"
            columns={EXPORT_PRESETS.staff}
            className="h-10"
          />

          <Button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-10 rounded-xl bg-secondary-600 px-4 text-sm font-semibold text-white hover:bg-secondary-700 shadow-xs cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Staff
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <AdminContent className="flex-1 min-h-0 min-w-0 mt-4">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-xs">
          {isLoading && !data ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <AdminTableSkeleton />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <ErrorState
                title="Failed to load staff list"
                message={error.message || "An error occurred while fetching staff members."}
                onRetry={() => refetch()}
              />
            </div>
          ) : (
            <>
              <BulkActionsBar
                selectedCount={selectedRows.length}
                entityName="staff members"
                filterNotice={search ? `Filtered by "${search}"` : undefined}
                onClearSelection={() => {
                  setSelectedRowIds({});
                  setSelectedRows([]);
                }}
                onExport={() => {
                  exportToExcel({
                    filename: "selected_staff",
                    sheetName: "Selected Staff",
                    data: selectedRows,
                    columns: EXPORT_PRESETS.staff,
                  });
                }}
              />

              <DataTable
                columns={columns}
                data={staffList}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 30, 50]}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
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
                className="bg-white border-0"
                emptyMessage={
                  search.trim() || statusFilter !== "all"
                    ? "No staff members matched your filter criteria."
                    : "No staff members found. Click '+ Create Staff' to add your first staff member."
                }
              />
            </>
          )}
        </div>
      </AdminContent>

      {/* Create / Edit Staff Modal */}
      <StaffFormModal
        open={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
      />
    </div>
  );
}
