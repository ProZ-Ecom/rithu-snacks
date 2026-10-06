"use client";

import { useState, useMemo } from "react";
import {
  useAdminContactMessages,
  useUpdateContactMessageStatus,
  type AdminContactMessageListItem,
  type ContactMessageStatus,
  AdminContactDetailModal,
  AdminContactReplyModal,
} from "@/features/contact";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { StatsCard } from "@/components/admin/StatsCard";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export default function AdminContactsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected contact for detail modal
  const [selectedContact, setSelectedContact] =
    useState<AdminContactMessageListItem | null>(null);

  // Selected contact for reply modal
  const [replyTargetContact, setReplyTargetContact] =
    useState<AdminContactMessageListItem | null>(null);

  // Build query params
  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: ContactMessageStatus;
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
      params.status = statusFilter as ContactMessageStatus;
    }

    return params;
  }, [page, pageSize, search, statusFilter]);

  // Query contact messages list
  const { data, isLoading, error, refetch } = useAdminContactMessages(queryParams);

  // Also query total counts for stats (unfiltered list meta)
  const { data: allMessagesData } = useAdminContactMessages({
    page: 1,
    pageSize: 100,
  });

  const contacts = data?.data ?? [];
  const meta = data?.meta;

  const allMessages = allMessagesData?.data ?? [];
  const totalCount = allMessagesData?.meta?.total ?? meta?.total ?? 0;
  const newCount = allMessages.filter((m) => m.status === "new").length;
  const readCount = allMessages.filter((m) => m.status === "read").length;
  const repliedCount = allMessages.filter((m) => m.status === "replied").length;

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  const getStatusBadge = (status: ContactMessageStatus) => {
    switch (status) {
      case "new":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            New
          </Badge>
        );
      case "read":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            Read
          </Badge>
        );
      case "replied":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Replied
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: ColumnDef<AdminContactMessageListItem, unknown>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => {
        const item = row.original;
        const initial = item.name?.charAt(0)?.toUpperCase() || "C";
        return (
          <div
            onClick={() => setSelectedContact(item)}
            className="group flex items-center gap-3 cursor-pointer"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-neutral-200 bg-secondary-100 flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-secondary-500/40 transition-all text-secondary-700 font-bold text-xs">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 leading-snug group-hover:text-secondary-600 transition-colors truncate max-w-[160px] sm:max-w-[200px]">
                {item.name || "Anonymous"}
              </p>
              <p className="text-xs text-neutral-500 truncate max-w-[160px] sm:max-w-[200px]">
                {item.email}
              </p>
              {item.phone && (
                <p className="text-[11px] text-neutral-400 font-mono">
                  {item.phone}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject & Message",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div
            onClick={() => setSelectedContact(item)}
            className="space-y-0.5 max-w-xs sm:max-w-md cursor-pointer group"
          >
            <p className="font-semibold text-neutral-800 text-sm truncate group-hover:text-secondary-600 transition-colors">
              {item.subject || "No Subject"}
            </p>
            <p className="text-xs text-neutral-500 line-clamp-1">
              {item.message || "—"}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return getStatusBadge(row.original.status);
      },
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
              onClick={() => setSelectedContact(item)}
              className="inline-flex items-center h-8 gap-1 px-2.5 rounded-lg text-xs font-semibold text-secondary-600 hover:text-secondary-700 hover:bg-secondary-50 cursor-pointer transition-colors"
              title="View Message"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>

            <button
              type="button"
              onClick={() => setReplyTargetContact(item)}
              className="inline-flex items-center h-8 gap-1 px-2.5 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition-colors"
              title="Reply by Email"
            >
              <Send className="h-3.5 w-3.5 text-neutral-500" />
              <span>Reply</span>
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
        message="Failed to load contact messages"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">

      <AdminPageHeader
        title="Contact Inquiries"
        description="Review customer messages submitted via the Contact Us form, track resolution status, and send replies"
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
        <StatsCard
          title="Total Inquiries"
          value={isLoading ? "—" : totalCount}
          icon={Mail}
          description="Total contact form submissions"
        />
        <StatsCard
          title="New Messages"
          value={isLoading ? "—" : newCount}
          icon={AlertCircle}
          description="Awaiting review or action"
        />
        <StatsCard
          title="Read Messages"
          value={isLoading ? "—" : readCount}
          icon={MessageSquare}
          description="Reviewed by team"
        />
        <StatsCard
          title="Replied"
          value={isLoading ? "—" : repliedCount}
          icon={CheckCircle2}
          description="Responded via email"
        />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex-shrink-0 flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              placeholder="Search by name, email, phone, subject, or message..."
              value={search}
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full sm:max-w-xs md:max-w-md"
            />

            {/* Status Filter Dropdown */}
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "new", label: "New Messages" },
                  { value: "read", label: "Read Messages" },
                  { value: "replied", label: "Replied Messages" },
                ]}
                placeholder="Filter by Status"
                className="h-10 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <ClearFiltersButton onClick={handleResetFilters} />
            )}

            <ExportExcelButton
              data={contacts}
              filename="contact_messages"
              sheetName="Contacts"
              columns={EXPORT_PRESETS.contacts}
            />
          </div>
        </div>

        {/* Quick Filter Status Pills */}
        {/* <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono mr-1 shrink-0">
            Status:
          </span>
          {[
            { id: "all", label: "All", count: totalCount },
            { id: "new", label: "New", count: newCount },
            { id: "read", label: "Read", count: readCount },
            { id: "replied", label: "Replied", count: repliedCount },
          ].map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setStatusFilter(pill.id);
                  setPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-secondary-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900"
                )}
              >
                <span>{pill.label}</span>
                {pill.count !== undefined && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-white text-neutral-600 border border-neutral-200"
                    )}
                  >
                    {pill.count}
                  </span>
                )}
              </button>
            );
          })}
        </div> */}
      </div>

      {/* Data Table Container */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col w-full">
        <DataTable
          columns={columns}
          data={contacts}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50]}
          page={meta?.page ?? page}
          totalPages={
            meta?.totalPages ??
            Math.max(1, Math.ceil((meta?.total ?? contacts.length) / pageSize))
          }
          totalItems={meta?.total ?? contacts.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          className="bg-white"
          emptyMessage="No contact messages found matching your criteria."
        />
      </div>

      {/* Detail View Modal */}
      <AdminContactDetailModal
        contact={selectedContact}
        open={Boolean(selectedContact)}
        onClose={() => setSelectedContact(null)}
        onOpenReply={(contact) => {
          setSelectedContact(null);
          setReplyTargetContact(contact);
        }}
      />

      {/* Reply Modal */}
      <AdminContactReplyModal
        contact={replyTargetContact}
        open={Boolean(replyTargetContact)}
        onClose={() => setReplyTargetContact(null)}
      />
    </div>
  );
}
