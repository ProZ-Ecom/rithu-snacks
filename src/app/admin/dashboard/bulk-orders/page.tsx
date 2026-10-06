"use client";

import { useState, useMemo } from "react";
import {
  useAdminBulkOrders,
  type AdminBulkOrderListItem,
  type BulkOrderEnquiryStatus,
  AdminBulkOrderDetailModal,
} from "@/features/bulk-orders";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  PackagePlus,
  AlertCircle,
  CheckCircle2,
  Phone,
  Eye,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export default function AdminBulkOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedEnquiry, setSelectedEnquiry] =
    useState<AdminBulkOrderListItem | null>(null);

  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: BulkOrderEnquiryStatus;
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

    if (statusFilter !== "all") {
      params.status = statusFilter as BulkOrderEnquiryStatus;
    }

    return params;
  }, [page, pageSize, search, statusFilter]);

  const { data, isLoading, isFetching, error, refetch } = useAdminBulkOrders(queryParams);

  const { data: allEnquiriesData, refetch: refetchAll } = useAdminBulkOrders({
    page: 1,
    pageSize: 100,
  });

  const enquiries = data?.data ?? [];
  const meta = data?.meta;

  const allEnquiries = allEnquiriesData?.data ?? [];
  const totalCount = allEnquiriesData?.meta?.total ?? meta?.total ?? 0;
  const newCount = allEnquiries.filter((e) => e.status === "new").length;
  const contactedCount = allEnquiries.filter((e) => e.status === "contacted").length;
  const closedCount = allEnquiries.filter((e) => e.status === "closed").length;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  const getStatusBadge = (status: BulkOrderEnquiryStatus) => {
    switch (status) {
      case "new":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            New
          </Badge>
        );
      case "contacted":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            Contacted
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Closed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: ColumnDef<AdminBulkOrderListItem, unknown>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => {
        const item = row.original;
        const initial = item.name?.charAt(0)?.toUpperCase() || "C";
        return (
          <div
            onClick={() => setSelectedEnquiry(item)}
            className="group flex items-center gap-3 cursor-pointer"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-neutral-200 bg-secondary-100 flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-secondary-500/40 transition-all text-secondary-700 font-bold text-xs">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 leading-snug group-hover:text-secondary-600 transition-colors truncate max-w-[160px] sm:max-w-[200px]">
                {item.name}
              </p>
              <p className="text-xs text-neutral-500 truncate max-w-[160px] sm:max-w-[200px]">
                {item.email}
              </p>
              {item.companyName && (
                <p className="text-[11px] text-neutral-400 truncate max-w-[160px] sm:max-w-[200px]">
                  {item.companyName}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "productInterest",
      header: "Product & Quantity",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div
            onClick={() => setSelectedEnquiry(item)}
            className="space-y-0.5 max-w-xs cursor-pointer group"
          >
            <p className="font-semibold text-neutral-800 text-sm truncate group-hover:text-secondary-600 transition-colors">
              {item.productInterest || "Not specified"}
            </p>
            <p className="text-xs text-neutral-500">{item.quantity} units</p>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <a
          href={`tel:${row.original.phone}`}
          className="inline-flex items-center gap-1 text-xs font-mono text-neutral-700 hover:text-secondary-600"
        >
          <Phone className="h-3 w-3" />
          {row.original.phone}
        </a>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "createdAt",
      header: "Received At",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!date) return "—";
        return (
          <div className="text-xs text-neutral-600 space-y-0.5">
            <p className="font-medium text-neutral-800">
              {new Date(date).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-[11px] text-neutral-400">
              {new Date(date).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedEnquiry(item)}
              className="inline-flex items-center h-8 gap-1 px-2.5 rounded-lg text-xs font-semibold text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 cursor-pointer transition-colors"
              title="View Enquiry"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>
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
        message="Failed to load bulk order enquiries"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Bulk Order Enquiries"
        description="Review bulk order enquiries submitted via the storefront and track follow-up status"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Auto-Sync
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                refetchAll();
              }}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-secondary-600")}
              />
              <span>{isFetching ? "Syncing..." : "Refresh"}</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
        <StatsCard
          title="Total Enquiries"
          value={isLoading ? "—" : totalCount}
          icon={PackagePlus}
          description="Total bulk order submissions"
        />
        <StatsCard
          title="New"
          value={isLoading ? "—" : newCount}
          icon={AlertCircle}
          description="Awaiting follow-up"
        />
        <StatsCard
          title="Contacted"
          value={isLoading ? "—" : contactedCount}
          icon={Phone}
          description="Team has reached out"
        />
        <StatsCard
          title="Closed"
          value={isLoading ? "—" : closedCount}
          icon={CheckCircle2}
          description="Enquiry resolved"
        />
      </div>

      <div className="flex-shrink-0 flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              placeholder="Search by name, email, phone, company, or product..."
              value={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full sm:max-w-xs md:max-w-md"
            />

            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "new", label: "New" },
                  { value: "contacted", label: "Contacted" },
                  { value: "closed", label: "Closed" },
                ]}
                placeholder="Filter by Status"
                className="h-10 rounded-xl text-xs font-medium"
              />
            </div>

            {hasActiveFilters && (
              <ClearFiltersButton onClick={handleResetFilters} />
            )}

            <ExportExcelButton
              data={enquiries}
              filename="bulk_order_enquiries"
              sheetName="Bulk Orders"
              columns={EXPORT_PRESETS.bulkOrders}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 flex flex-col w-full">
        <DataTable
          columns={columns}
          data={enquiries}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50]}
          page={meta?.page ?? page}
          totalPages={
            meta?.totalPages ??
            Math.max(1, Math.ceil((meta?.total ?? enquiries.length) / pageSize))
          }
          totalItems={meta?.total ?? enquiries.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          className="bg-white"
          emptyMessage="No bulk order enquiries found matching your criteria."
        />
      </div>

      <AdminBulkOrderDetailModal
        enquiry={selectedEnquiry}
        open={Boolean(selectedEnquiry)}
        onClose={() => setSelectedEnquiry(null)}
      />
    </div>
  );
}
