"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Truck,
  RotateCcw,
  UserCheck,
  Package,
} from "lucide-react";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { exportToExcel } from "@/lib/excel-export";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { formatDateTime, formatPrice } from "@/lib/utils";
import {
  useAdminDeliveryOrders,
  useAdminDeliveryStaff,
  getAdminDeliveryOrders,
} from "../hooks";
import { DeliveryStatusBadge, AssignmentStatusBadge } from "./DeliveryStatusBadge";
import { AssignStaffModal } from "@/features/orders/components/AssignStaffModal";
import type { AdminDeliveryOrderItem } from "../types/delivery.types";

export function AdminDeliveryOrdersTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>("");

  const [assignModalOrder, setAssignModalOrder] = useState<{
    id: string;
    orderNumber: string;
  } | null>(null);

  // Bulk Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<AdminDeliveryOrderItem[]>([]);

  useEffect(() => {
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, selectedStaffId, selectedDeliveryStatus, page, pageSize]);

  const { data: staffData } = useAdminDeliveryStaff({
    page: 1,
    limit: 100,
    isActive: true,
  });

  const staffList = staffData?.data ?? [];

  const { data, isLoading, error, refetch, isFetching } = useAdminDeliveryOrders({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    staffId: selectedStaffId || undefined,
    deliveryStatus: (selectedDeliveryStatus || undefined) as
      | "pending"
      | "picked_up"
      | "in_transit"
      | "out_for_delivery"
      | "delivered"
      | "failed"
      | undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const columns: ColumnDef<AdminDeliveryOrderItem, unknown>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order / Placed",
      cell: ({ row }) => (
        <div className="leading-snug">
          <span className="font-bold text-neutral-900">
            #{row.original.orderNumber}
          </span>
          <div className="text-[11px] text-neutral-400 font-mono">
            {formatDateTime(row.original.createdAt)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        return (
          <div className="leading-snug max-w-[180px]">
            <div className="font-semibold text-neutral-900 truncate">
              {customer?.name || "Customer"}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono truncate">
              {customer?.phone || customer?.email || "—"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "shippingAddress",
      header: "Delivery Address",
      cell: ({ row }) => {
        const addr = row.original.shippingAddress;
        if (!addr) return <span className="text-xs text-neutral-400">—</span>;

        return (
          <div className="leading-snug max-w-[200px]">
            <div className="text-xs font-medium text-neutral-900 truncate">
              {addr.addressLine1}
            </div>
            <div className="text-[11px] text-neutral-500 truncate">
              {addr.city}, {addr.pincode}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "shipment.deliveryStaff",
      header: "Assigned Staff",
      cell: ({ row }) => {
        const staff = row.original.shipment?.deliveryStaff;
        if (!staff) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Package className="h-3 w-3" />
              Unassigned
            </span>
          );
        }

        return (
          <div className="leading-snug">
            <div className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-secondary-600 text-white text-[10px] font-bold">
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[120px]">{staff.name}</span>
            </div>
            {staff.phone && (
              <div className="text-[10.5px] text-neutral-500 font-mono mt-0.5">
                {staff.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-bold text-neutral-900 tabular-nums text-sm">
          {formatPrice(row.original.totalAmount)}
        </span>
      ),
    },
    {
      accessorKey: "shipment.status",
      header: "Shipment Status",
      cell: ({ row }) => {
        const shipment = row.original.shipment;
        if (!shipment) {
          return (
            <span className="text-xs text-neutral-500 font-medium capitalize">
              Order: {row.original.orderStatus}
            </span>
          );
        }

        const assignmentStatus = (shipment.assignmentStatus || "").toLowerCase();
        if (assignmentStatus === "pending") {
          return <AssignmentStatusBadge status="pending" />;
        }
        if (assignmentStatus === "rejected") {
          return <AssignmentStatusBadge status="rejected" />;
        }

        return <DeliveryStatusBadge status={shipment.status} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isPacked = row.original.orderStatus === "packed";
        const shipment = row.original.shipment;
        const assignmentStatus = (shipment?.assignmentStatus || "pending").toLowerCase();
        const hasStaff = Boolean(shipment?.deliveryStaff);

        const canAssign = isPacked && (!shipment || !hasStaff);
        const canChange = isPacked && hasStaff && assignmentStatus === "pending";
        const canReassign = isPacked && hasStaff && assignmentStatus === "rejected";

        return (
          <div className="flex items-center justify-center gap-1.5">
            {canAssign && (
              <button
                type="button"
                onClick={() =>
                  setAssignModalOrder({
                    id: row.original.id,
                    orderNumber: row.original.orderNumber,
                  })
                }
                title="Assign Delivery Staff"
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-secondary-600 bg-secondary-600 text-xs font-semibold text-white hover:bg-secondary-700 transition-all cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Assign</span>
              </button>
            )}

            {canChange && (
              <button
                type="button"
                onClick={() =>
                  setAssignModalOrder({
                    id: row.original.id,
                    orderNumber: row.original.orderNumber,
                  })
                }
                title="Change Delivery Staff (Before acceptance)"
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-amber-600 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Change</span>
              </button>
            )}

            {canReassign && (
              <button
                type="button"
                onClick={() =>
                  setAssignModalOrder({
                    id: row.original.id,
                    orderNumber: row.original.orderNumber,
                  })
                }
                title="Reassign Delivery Staff (Previous staff declined)"
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-rose-600 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Reassign</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading && !data) {
    return <LoadingState text="Loading all delivery orders..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load delivery orders"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-cream-border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            placeholder="Search by order #, customer name, phone..."
            defaultValue={search}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
            className="w-full sm:w-64"
          />

          <div className="w-48">
            <Select
              value={selectedDeliveryStatus}
              onValueChange={(val) => {
                setSelectedDeliveryStatus(val);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Shipment Statuses" },
                { value: "pending", label: "Pending" },
                { value: "picked_up", label: "Picked Up" },
                { value: "in_transit", label: "In Transit" },
                { value: "out_for_delivery", label: "Out for Delivery" },
                { value: "delivered", label: "Delivered" },
                { value: "failed", label: "Failed" },
              ]}
              size="sm"
              className="h-10 rounded-xl font-semibold"
            />
          </div>

          <div className="w-48">
            <Select
              value={selectedStaffId}
              onValueChange={(val) => {
                setSelectedStaffId(val);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Delivery Staff" },
                ...staffList.map((s) => ({
                  value: String(s.id),
                  label: `${s.name} (${s.phone || "Staff"})`,
                })),
              ]}
              size="sm"
              className="h-10 rounded-xl font-semibold"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <ExportExcelButton
            data={orders}
            fetchData={async () => {
              const res = await getAdminDeliveryOrders({
                page: 1,
                limit: 10000,
                search: search.trim() || undefined,
                staffId: selectedStaffId || undefined,
                deliveryStatus: (selectedDeliveryStatus || undefined) as any,
                sortBy: "createdAt",
                sortOrder: "desc",
              });
              return res?.data ?? [];
            }}
            totalCount={meta?.total ?? orders.length}
            filename="delivery_orders"
            sheetName="Deliveries"
            columns={EXPORT_PRESETS.deliveryOrders}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 px-3 rounded-xl border-cream-border hover:bg-cream-100 cursor-pointer"
          >
            <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 flex flex-col">
        <BulkActionsBar
          selectedCount={selectedRows.length}
          entityName="delivery order"
          filterNotice={search ? `Filtered by "${search}"` : undefined}
          onClearSelection={() => {
            setSelectedRowIds({});
            setSelectedRows([]);
          }}
          onExport={() => {
            exportToExcel({
              filename: "selected_delivery_orders",
              sheetName: "Selected Deliveries",
              data: selectedRows,
              columns: EXPORT_PRESETS.deliveryOrders,
            });
          }}
        />

        <DataTable
          columns={columns}
          data={orders}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50]}
          page={meta?.page ?? page}
          totalPages={
            meta?.totalPages ??
            Math.max(1, Math.ceil((meta?.total ?? orders.length) / pageSize))
          }
          totalItems={meta?.total ?? orders.length}
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
          emptyMessage="No delivery orders found matching your criteria."
        />
      </div>

      {/* Assign Delivery Staff Modal */}
      <AssignStaffModal
        open={Boolean(assignModalOrder)}
        onClose={() => setAssignModalOrder(null)}
        orderId={assignModalOrder?.id ?? null}
        orderNumber={assignModalOrder?.orderNumber}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
