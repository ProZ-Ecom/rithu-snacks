"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  useAdminCustomers,
  useAdminCustomersCount,
  useUpdateCustomerStatus,
  type AdminCustomerListItemDto,
} from "@/features/customers";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { StatsCard } from "@/components/admin/StatsCard";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  Users,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Search,
  Eye,
  RotateCcw,
  X,
  CheckCircle2,
  Ban,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected customer for block/unblock dialog
  const [statusTargetCustomer, setStatusTargetCustomer] =
    useState<AdminCustomerListItemDto | null>(null);

  const { mutate: updateCustomerStatus, isPending: isUpdatingStatus } =
    useUpdateCustomerStatus();

  // 1. Fetch real customer KPI counts from backend count API
  const { data: customerCounts, isLoading: isLoadingCounts } =
    useAdminCustomersCount();

  // Reset pagination on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, genderFilter, verificationFilter]);

  // Build query parameters with active / inactive / blocked / unblocked filters
  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: "active" | "inactive" | "banned";
      isActive?: boolean;
      isBlocked?: boolean;
      gender?: "male" | "female" | "other";
      emailVerified?: boolean;
      phoneVerified?: boolean;
      sortBy: "createdAt";
      sortOrder: "desc";
    } = {
      page,
      pageSize,
      sortBy: "createdAt",
      sortOrder: "desc",
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (statusFilter === "active") {
      params.isActive = true;
      params.isBlocked = false;
    } else if (statusFilter === "inactive") {
      params.isActive = false;
    } else if (statusFilter === "blocked") {
      params.isBlocked = true;
    } else if (statusFilter === "unblocked") {
      params.isBlocked = false;
    }

    if (genderFilter !== "all") {
      params.gender = genderFilter as "male" | "female" | "other";
    }

    if (verificationFilter === "email_verified") {
      params.emailVerified = true;
    } else if (verificationFilter === "phone_verified") {
      params.phoneVerified = true;
    }

    return params;
  }, [page, pageSize, search, statusFilter, genderFilter, verificationFilter]);

  // 2. Fetch customers list
  const { data, isLoading, error, refetch } = useAdminCustomers(queryParams);

  const customers = data?.data ?? [];
  const meta = data?.meta;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGenderFilter("all");
    setVerificationFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    genderFilter !== "all" ||
    verificationFilter !== "all";

  const handleConfirmStatusChange = () => {
    if (!statusTargetCustomer) return;
    const isCurrentlyBlocked =
      statusTargetCustomer.isBlocked === true ||
      statusTargetCustomer.isActive === false ||
      statusTargetCustomer.status === "banned" ||
      statusTargetCustomer.status === "inactive";

    const targetId =
      statusTargetCustomer.id || statusTargetCustomer.userId || "";

    updateCustomerStatus(
      {
        uuid: targetId,
        isActive: isCurrentlyBlocked, // unblock if blocked, block if active
      },
      {
        onSettled: () => {
          setStatusTargetCustomer(null);
        },
      }
    );
  };

  const columns: ColumnDef<AdminCustomerListItemDto, unknown>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => {
        const item = row.original;
        const initial = item.name?.charAt(0)?.toUpperCase() || "C";
        return (
          <Link
            href={`/admin/dashboard/customers/${item.id}`}
            className="group flex items-center gap-3 cursor-pointer"
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-neutral-200 bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-secondary-500/40 transition-all">
              {item.profileImage ? (
                <Image
                  src={item.profileImage}
                  alt={item.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-primary-700">
                  {initial}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-neutral-900 leading-snug group-hover:text-secondary-600 transition-colors">
                {item.name || "Unnamed Customer"}
              </p>
              <p className="text-xs text-neutral-500 font-mono">
                {item.customerId
                  ? `ID: ${item.customerId}`
                  : item.id
                  ? `ID: ${item.id.slice(0, 8)}...`
                  : "-"}
              </p>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Contact Details",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-sm text-neutral-800">{item.email || "-"}</p>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span>{item.phone || "-"}</span>
              {item.isWhatsapp && (
                <span className="inline-flex items-center gap-0.5 text-success-600 bg-success-50 px-1.5 py-0.5 rounded text-[10px] font-medium" title="WhatsApp Enabled">
                  <MessageSquare className="h-3 w-3" />
                  WA
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "gender",
      header: "Gender / DOB",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <p className="text-sm text-neutral-800 capitalize">
              {item.gender || "-"}
            </p>
            <p className="text-xs text-neutral-500">
              {item.dob || "-"}
            </p>
          </div>
        );
      },
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {item.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Email
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                Email
              </span>
            )}
            {item.phoneVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Phone
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        const isBlocked =
          item.isBlocked === true ||
          item.isActive === false ||
          item.status === "banned" ||
          item.status === "inactive";

        if (isBlocked) {
          return (
            <Badge
              variant="destructive"
              className="gap-1 bg-red-100 text-red-800 border-red-200"
            >
              <ShieldAlert className="h-3 w-3" />
              Blocked
            </Badge>
          );
        }

        return (
          <Badge
            variant="success"
            className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200"
          >
            <ShieldCheck className="h-3 w-3" />
            Active
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Registered",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) => {
        const date = row.original.lastLoginAt;
        if (!date) return <span className="text-xs text-neutral-400">Never</span>;
        return (
          <span className="text-xs text-neutral-600">
            {new Date(date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const isBlocked =
          item.isBlocked === true ||
          item.isActive === false ||
          item.status === "banned" ||
          item.status === "inactive";

        return (
          <div className="flex items-center justify-center gap-1.5">
            <Link
              href={`/admin/dashboard/customers/${item.id}`}
              className="inline-flex items-center h-8 gap-1 px-2.5 rounded-lg text-xs font-semibold text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 cursor-pointer transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>

            {isBlocked ? (
              <button
                type="button"
                onClick={() => setStatusTargetCustomer(item)}
                className="inline-flex items-center h-8 gap-1 px-2 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer transition-colors"
                title="Unblock Customer"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Unblock
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStatusTargetCustomer(item)}
                className="inline-flex items-center h-8 gap-1 px-2 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                title="Block Customer"
              >
                <Ban className="h-3.5 w-3.5 text-red-500" />
                Block
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load customers"
        onRetry={() => refetch()}
      />
    );
  }

  const isTargetBlocked =
    statusTargetCustomer?.isBlocked === true ||
    statusTargetCustomer?.isActive === false ||
    statusTargetCustomer?.status === "banned" ||
    statusTargetCustomer?.status === "inactive";

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Customers"
        description="View and manage registered customers who have logged in or registered through the store"
      />

      {/* KPI Summary Cards from Count API */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
        <StatsCard
          title="Total Customers"
          value={isLoadingCounts ? "—" : (customerCounts?.all ?? 0)}
          icon={Users}
          description="Registered store customers"
        />
        <StatsCard
          title="Active Customers"
          value={isLoadingCounts ? "—" : (customerCounts?.active ?? 0)}
          icon={UserCheck}
          description="Active customer accounts"
        />
        <StatsCard
          title="Blocked Customers"
          value={isLoadingCounts ? "—" : (customerCounts?.blocked ?? 0)}
          icon={ShieldAlert}
          description="Blocked or deactivated accounts"
        />
        <StatsCard
          title="Verified Accounts"
          value={isLoadingCounts ? "—" : (customerCounts?.verified ?? 0)}
          icon={ShieldCheck}
          description="Email or phone verified"
        />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex-shrink-0 flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Search + Filter Selects */}
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              placeholder="Search by name, email, phone, or customer ID..."
              value={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full sm:max-w-xs md:max-w-sm"
            />

            {/* Status Filter (Active, Inactive, Blocked, Unblocked) */}
            <div className="w-full sm:w-44">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "blocked", label: "Blocked" },
                  { value: "unblocked", label: "Unblocked" },
                ]}
                placeholder="Filter by Status"
                className="h-10 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Verification Filter */}
            <div className="w-full sm:w-44">
              <Select
                value={verificationFilter}
                onChange={(e) => {
                  setVerificationFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Verification" },
                  { value: "email_verified", label: "Email Verified" },
                  { value: "phone_verified", label: "Phone Verified" },
                ]}
                placeholder="Verification"
                className="h-10 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Gender Filter */}
            <div className="w-full sm:w-36">
              <Select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Genders" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                placeholder="Gender"
                className="h-10 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <ClearFiltersButton onClick={handleResetFilters} />
            )}
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col w-full">
        <DataTable
          columns={columns}
          data={customers}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50]}
          page={meta?.page ?? page}
          totalPages={
            meta?.totalPages ??
            Math.max(1, Math.ceil((meta?.total ?? customers.length) / pageSize))
          }
          totalItems={meta?.total ?? customers.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          className="bg-white"
          emptyMessage="No customers found matching your criteria."
        />
      </div>

      {/* Confirm Block / Unblock Modal */}
      <ConfirmDialog
        open={Boolean(statusTargetCustomer)}
        onClose={() => setStatusTargetCustomer(null)}
        onConfirm={handleConfirmStatusChange}
        title={
          isTargetBlocked
            ? "Unblock Customer Account"
            : "Block Customer Account"
        }
        description={
          isTargetBlocked
            ? `Are you sure you want to unblock ${
                statusTargetCustomer?.name || "this customer"
              }? Their account will be reactivated, allowing them to sign in and place new orders.`
            : `Are you sure you want to block ${
                statusTargetCustomer?.name || "this customer"
              }? This will deactivate their account and prevent them from signing in or placing new orders.`
        }
        confirmText={
          isUpdatingStatus
            ? isTargetBlocked
              ? "Unblocking..."
              : "Blocking..."
            : isTargetBlocked
            ? "Unblock Customer"
            : "Block Customer"
        }
        cancelText="Cancel"
        variant={isTargetBlocked ? "default" : "destructive"}
        isLoading={isUpdatingStatus}
      />
    </div>
  );
}
