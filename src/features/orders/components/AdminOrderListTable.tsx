"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  XCircle,
  Printer,
  CheckCircle,
  PackageCheck,
  PlayCircle,
  Loader2,
  ArrowRight,
  Truck,
  Package,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import { AssignStaffModal } from "@/features/orders/components/AssignStaffModal";
import {
  useAdminOrders,
  useAdminOrder,
  useConfirmAdminOrder,
  useProcessAdminOrder,
  usePackAdminOrder,
  useCancelOrderAdmin,
} from "@/features/orders/hooks";
import { OrderDetailView } from "@/features/orders/components/OrderDetailView";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  PAYMENT_STATUS_LABELS,
} from "@/features/orders/components/OrderStatusBadge";
import {
  PAYMENT_STATUSES,
  type OrderListItemResponse,
  type OrderStatus,
  type PaymentStatus,
} from "@/features/orders/types";

interface AdminOrderListTableProps {
  status?: OrderStatus;
  emptyMessage?: string;
}

export function AdminOrderListTable({
  status,
  emptyMessage = "No orders found matching your criteria.",
}: AdminOrderListTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [assignStaffOrder, setAssignStaffOrder] = useState<{
    id: string;
    orderNumber: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useAdminOrders({
    page,
    pageSize,
    search: search || undefined,
    status: status || undefined,
    paymentStatus: (paymentFilter || undefined) as PaymentStatus | undefined,
  });

  const {
    data: orderDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useAdminOrder(viewOrderId);

  const confirmOrder = useConfirmAdminOrder();
  const processOrder = useProcessAdminOrder();
  const packOrder = usePackAdminOrder();
  const cancelOrder = useCancelOrderAdmin();

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = () => {
    setSearch("");
    setPaymentFilter("");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || paymentFilter !== "";

  const handlePrint = (orderUuid: string) => {
    if (typeof window !== "undefined") {
      window.open(`/invoice/${orderUuid}`, "_blank", "noopener");
    }
  };

  const isTransitionPending =
    confirmOrder.isPending ||
    processOrder.isPending ||
    packOrder.isPending ||
    cancelOrder.isPending;

  const currentDetailStatus = orderDetail?.status?.toLowerCase();
  const isOrderLocked =
    !!orderDetail &&
    ["cancelled", "returned", "delivered"].includes(currentDetailStatus || "");

  const columns: ColumnDef<OrderListItemResponse, unknown>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order ID",
      cell: ({ row }) => (
        <div className="leading-snug">
          <button
            type="button"
            onClick={() => setViewOrderId(row.original.id)}
            className="text-left font-semibold text-neutral-900 hover:text-secondary-600 transition-colors cursor-pointer"
          >
            {row.original.orderNumber}
          </button>
          <div className="text-[11px] text-neutral-400">
            {formatDateTime(row.original.placedAt || row.original.createdAt)}
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
          <div className="leading-snug max-w-[200px] truncate">
            <div className="font-semibold text-neutral-900 truncate">
              {customer?.name || "Customer"}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono truncate">
              {customer?.phone ||
                customer?.email ||
                (customer?.customerId ? `ID: ${customer.customerId}` : "—")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "totalItems",
      header: "Items",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-neutral-700">
          {row.original.totalItems}{" "}
          {row.original.totalItems === 1 ? "item" : "items"}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold text-neutral-900 tabular-nums text-sm">
          {formatPrice(row.original.totalAmount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => (
        <div className="space-y-1">
          <PaymentStatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "delivery.staff",
      header: "Assigned Staff",
      cell: ({ row }) => {
        const delivery = row.original.delivery;
        const staff = delivery?.staff;
        const isAssigned = delivery?.isAssigned && !!staff;
        const orderStatus = (row.original.status || "").toLowerCase();
        const assignmentStatus = (delivery?.assignmentStatus || "pending").toLowerCase();

        if (!isAssigned || !staff) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-cream-100 px-2 py-0.5 rounded-full border border-cream-border">
                <Package className="h-3 w-3 text-neutral-400" />
                Unassigned
              </span>
              {orderStatus === "packed" && (
                <button
                  type="button"
                  onClick={() =>
                    setAssignStaffOrder({
                      id: row.original.id,
                      orderNumber: row.original.orderNumber,
                    })
                  }
                  title="Assign Staff"
                  className="text-[11px] font-semibold text-secondary-600 hover:underline cursor-pointer ml-0.5"
                >
                  Assign
                </button>
              )}
            </div>
          );
        }

        const initial = staff.name.charAt(0).toUpperCase();
        const isAccepted = assignmentStatus === "accepted";
        const isRejected = assignmentStatus === "rejected";
        const isPending = !isAccepted && !isRejected;

        return (
          <div className="flex items-center justify-between gap-2 max-w-[210px]">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-white text-xs font-bold shrink-0",
                  isAccepted
                    ? "bg-emerald-600"
                    : isRejected
                    ? "bg-rose-500"
                    : "bg-secondary-600"
                )}
              >
                {initial}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1 truncate">
                  <span
                    className={cn(
                      "font-semibold text-xs truncate",
                      isRejected ? "text-neutral-500 line-through" : "text-neutral-900"
                    )}
                  >
                    {staff.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  {isAccepted && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      <Check className="h-2.5 w-2.5" />
                      Accepted
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                      <Clock className="h-2.5 w-2.5" />
                      Pending
                    </span>
                  )}
                  {isRejected && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded"
                      title={delivery?.deliveryNotes || "Rejected by staff"}
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {orderStatus === "packed" && (
              <>
                {/* Allowed to change only before staff acceptance */}
                {isPending && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssignStaffOrder({
                        id: row.original.id,
                        orderNumber: row.original.orderNumber,
                      })
                    }
                    title="Change / Reassign Delivery Staff"
                    className="text-[11px] font-semibold text-secondary-600 hover:underline cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}

                {/* If rejected, allow reassigning new staff */}
                {isRejected && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssignStaffOrder({
                        id: row.original.id,
                        orderNumber: row.original.orderNumber,
                      })
                    }
                    title="Reassign a new Delivery Staff member"
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer shrink-0"
                  >
                    Reassign
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "placedAt",
      header: "Placed At",
      cell: ({ row }) => (
        <div className="leading-snug text-xs text-neutral-700">
          <div>
            {new Date(
              row.original.placedAt || row.original.createdAt
            ).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="text-[11px] text-neutral-400">
            {new Date(
              row.original.placedAt || row.original.createdAt
            ).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const orderStatus = (row.original.status || "").toLowerCase();
        const isCancellable = !["cancelled", "delivered", "returned"].includes(
          orderStatus
        );

        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* Quick advance action button */}
            {orderStatus === "pending" && (
              <button
                type="button"
                onClick={() =>
                  confirmOrder.mutate(
                    { id: row.original.id, note: "Confirmed by admin" },
                    { onSuccess: () => refetch() }
                  )
                }
                title="Confirm Order"
                className="grid h-8 w-8 place-items-center rounded-lg border border-secondary-200 bg-secondary-50 text-xs font-semibold text-secondary-600 hover:brightness-95 transition-all cursor-pointer"
                disabled={isTransitionPending}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {orderStatus === "confirmed" && (
              <button
                type="button"
                onClick={() =>
                  processOrder.mutate(
                    { id: row.original.id, note: "Processing started" },
                    { onSuccess: () => refetch() }
                  )
                }
                title="Start Processing"
                className="grid h-8 w-8 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:brightness-95 transition-all cursor-pointer"
                disabled={isTransitionPending}
              >
                <PlayCircle className="h-3.5 w-3.5" />
              </button>
            )}

            {orderStatus === "processing" && (
              <button
                type="button"
                onClick={() =>
                  packOrder.mutate(
                    { id: row.original.id, note: "Marked as packed" },
                    { onSuccess: () => refetch() }
                  )
                }
                title="Mark as Packed"
                className="grid h-8 w-8 place-items-center rounded-lg border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-700 hover:brightness-95 transition-all cursor-pointer"
                disabled={isTransitionPending}
              >
                <PackageCheck className="h-3.5 w-3.5" />
              </button>
            )}

            {orderStatus === "packed" && (
              <>
                {/* If staff is already accepted, do not show assign/reassign quick button */}
                {row.original.delivery?.assignmentStatus?.toLowerCase() !== "accepted" && (
                  <button
                    type="button"
                    onClick={() =>
                      setAssignStaffOrder({
                        id: row.original.id,
                        orderNumber: row.original.orderNumber,
                      })
                    }
                    title={
                      row.original.delivery?.assignmentStatus?.toLowerCase() === "rejected"
                        ? "Reassign Delivery Staff (Previous staff declined)"
                        : row.original.delivery?.isAssigned && row.original.delivery?.staff
                        ? "Change Delivery Staff"
                        : "Assign Delivery Staff"
                    }
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-xs",
                      row.original.delivery?.assignmentStatus?.toLowerCase() === "rejected"
                        ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                        : row.original.delivery?.isAssigned && row.original.delivery?.staff
                        ? "border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
                        : "border-secondary-600 bg-secondary-600 text-white hover:bg-secondary-700"
                    )}
                    disabled={isTransitionPending}
                  >
                    <Truck className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setViewOrderId(row.original.id)}
              title="View Order Details"
              className="grid h-8 w-8 place-items-center rounded-lg border border-cream-border-subtle bg-white text-xs text-neutral-600 hover:bg-cream-200 hover:text-secondary-800 hover:border-cream-border-hover transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            {isCancellable && (
              <button
                type="button"
                onClick={() => setCancelOrderId(row.original.id)}
                title="Cancel Order"
                className="grid h-8 w-8 place-items-center rounded-lg border border-secondary-200 bg-white text-xs text-error-600 hover:bg-error-50 hover:border-error-200 transition-colors cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col bg-[var(--color-background)] rounded-2xl">
      {/* Filter and Search Bar */}
      <div className="flex-shrink-0 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            placeholder="Search by order number, customer name, email, phone..."
            value={search}
            onSearch={(val) => {
              setSearch(val.trim());
              setPage(1);
            }}
            className="w-full max-w-md bg-cream-50 border-cream-border-subtle"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-40">
            <Select
              value={paymentFilter}
              onValueChange={(val) => {
                setPaymentFilter(val);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Payments" },
                ...PAYMENT_STATUSES.map((ps) => ({
                  value: ps,
                  label: PAYMENT_STATUS_LABELS[ps] || ps,
                })),
              ]}
              size="sm"
              className="h-10 rounded-xl font-semibold"
            />
          </div>

          <ExportExcelButton
            data={orders}
            filename={`orders${status ? `_${status.toLowerCase()}` : ""}`}
            sheetName="Orders"
            columns={EXPORT_PRESETS.orders}
          />

          {hasActiveFilters && <ClearFiltersButton onClick={handleClearFilters} />}
        </div>
      </div>

      {/* Table & Pagination Content */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        {isLoading ? (
          <LoadingState text="Loading orders..." />
        ) : error ? (
          <ErrorState
            message="Failed to load orders. Please try again."
            onRetry={() => refetch()}
          />
        ) : (
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
            className="bg-white border border-cream-border"
            emptyMessage={emptyMessage}
          />
        )}
      </div>

      {/* Order Detail Modal */}
      <FormModal
        open={!!viewOrderId}
        onClose={() => setViewOrderId(null)}
        title={
          orderDetail ? `Order ${orderDetail.orderNumber}` : "Order Details"
        }
        description="Manage order status and fulfillment"
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setViewOrderId(null)}>
            Close
          </Button>
        }
      >
        {detailLoading || !orderDetail ? (
          <LoadingState text="Loading order details..." />
        ) : (
          <div className="space-y-4">
            {/* Status Workflow Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-1">
                  Current Status:
                </span>
                <OrderStatusBadge status={orderDetail.status} />
                {orderDetail.paymentStatus && (
                  <PaymentStatusBadge status={orderDetail.paymentStatus} />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentDetailStatus === "pending" && (
                  <Button
                    size="sm"
                    className="bg-secondary-600 hover:bg-secondary-700 text-white"
                    onClick={() => {
                      confirmOrder.mutate(
                        { id: orderDetail.id, note: "Order confirmed by admin" },
                        {
                          onSuccess: () => {
                            refetch();
                          },
                        }
                      );
                    }}
                    disabled={isTransitionPending}
                  >
                    {confirmOrder.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                    )}
                    Confirm Order
                  </Button>
                )}

                {currentDetailStatus === "confirmed" && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      processOrder.mutate(
                        {
                          id: orderDetail.id,
                          note: "Order processing started by admin",
                        },
                        {
                          onSuccess: () => {
                            refetch();
                          },
                        }
                      );
                    }}
                    disabled={isTransitionPending}
                  >
                    {processOrder.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-1.5 h-4 w-4" />
                    )}
                    Start Processing
                  </Button>
                )}

                {currentDetailStatus === "processing" && (
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      packOrder.mutate(
                        { id: orderDetail.id, note: "Order marked as packed" },
                        {
                          onSuccess: () => {
                            refetch();
                          },
                        }
                      );
                    }}
                    disabled={isTransitionPending}
                  >
                    {packOrder.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <PackageCheck className="mr-1.5 h-4 w-4" />
                    )}
                    Mark as Packed
                  </Button>
                )}

                {currentDetailStatus === "packed" && (
                  <Button
                    size="sm"
                    className="bg-secondary-600 hover:bg-secondary-700 text-white cursor-pointer"
                    onClick={() => {
                      setAssignStaffOrder({
                        id: orderDetail.id,
                        orderNumber: orderDetail.orderNumber,
                      });
                    }}
                    disabled={isTransitionPending}
                  >
                    <Truck className="mr-1.5 h-4 w-4" />
                    {orderDetail.delivery?.isAssigned && orderDetail.delivery?.staff
                      ? "Reassign Delivery Staff"
                      : "Assign Delivery Staff"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(orderDetail.id)}
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print Invoice
                </Button>

                {!isOrderLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-error-600 border-error-200 hover:bg-error-50"
                    onClick={() => setCancelOrderId(orderDetail.id)}
                    disabled={isTransitionPending}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Cancel Order
                  </Button>
                )}
              </div>

              {isOrderLocked && (
                <p className="w-full text-xs text-muted-foreground italic pt-1">
                  This order is {orderDetail.status.toLowerCase()} and can no
                  longer be modified.
                </p>
              )}
            </div>

            <OrderDetailView order={orderDetail} />
          </div>
        )}
      </FormModal>

      {/* Assign Staff Modal */}
      <AssignStaffModal
        open={!!assignStaffOrder}
        onClose={() => setAssignStaffOrder(null)}
        orderId={assignStaffOrder?.id ?? null}
        orderNumber={assignStaffOrder?.orderNumber}
        onSuccess={() => {
          refetch();
          if (viewOrderId) {
            refetchDetail();
          }
        }}
      />

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        open={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={() => {
          if (cancelOrderId) {
            cancelOrder.mutate(
              { id: cancelOrderId, note: "Cancelled by administrator" },
              {
                onSuccess: () => {
                  setCancelOrderId(null);
                  refetch();
                },
              }
            );
          }
        }}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action will mark the order as cancelled in the database."
        confirmText="Cancel Order"
        variant="destructive"
        isLoading={cancelOrder.isPending}
      />
    </div>
  );
}
