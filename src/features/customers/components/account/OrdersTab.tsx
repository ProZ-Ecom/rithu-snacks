"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Package, X, Navigation, ExternalLink, Truck } from "lucide-react";
import { formatPrice, getImageUrl } from "@/lib/utils";
import type { OrderDetailResponse } from "@/features/orders/types";
import { useCustomerOrders, useCancelCustomerOrder } from "../../hooks/use-customer-orders";
import { useAddToCartMutation } from "../../hooks/use-customer-cart";
import { CustomDropdown, type DropdownOption } from "./CustomDropdown";
import { SearchInput } from "@/components/common/search-input";
import { ProductImage } from "@/components/common/ProductImage";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiveTrackingModal } from "@/features/orders/components/LiveTrackingModal";

const STATUS_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

interface OrdersTabProps {
  orders?: OrderDetailResponse[];
  isLoading?: boolean;
  error?: Error | null;
  onRefetch?: () => void;
}

export function OrdersTab({
  orders: initialOrders = [],
  isLoading: initialLoading,
  error: initialError,
  onRefetch,
}: OrdersTabProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [trackingOrder, setTrackingOrder] = useState<OrderDetailResponse | null>(null);
  const [liveCourierTracking, setLiveCourierTracking] = useState<{
    trackingNumber: string;
    courierName?: string;
    orderNumber?: string;
  } | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderSuccessId, setReorderSuccessId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderDetailResponse | null>(null);

  const cancelMutation = useCancelCustomerOrder();
  const addToCartMutation = useAddToCartMutation();

  const {
    data: ordersResponse,
    isLoading: isOrdersLoading,
    isFetching,
    error: ordersQueryError,
    refetch: refetchQuery,
  } = useCustomerOrders({
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  });

  const orders = ordersResponse?.data ?? initialOrders;
  const isLoading = isOrdersLoading || (initialLoading && !ordersResponse) || isFetching;
  const error = ordersQueryError || initialError;

  const handleRefetch = () => {
    refetchQuery();
    onRefetch?.();
  };

  const getStatusMeta = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
      case "cancelled":
        return { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" };
      case "returned":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" };
      case "out_for_delivery":
      case "shipped":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" };
      case "packed":
      case "processing":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
      case "pending":
      case "confirmed":
        return { bg: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" };
      default:
        return { bg: "bg-theme-surface-alt text-theme-text-muted border-theme-border", dot: "bg-theme-border" };
    }
  };

  // 4 Breakpoint Stepper (Placed -> Packed by Admin, Out for Delivery by Staff, Delivered / Returned / Cancelled)
  const getTrackingStepIndex = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "confirmed":
        return 0;
      case "processing":
      case "packed":
        return 1;
      case "shipped":
      case "out_for_delivery":
        return 2;
      case "delivered":
      case "returned":
      case "cancelled":
        return 3;
      default:
        return 0;
    }
  };

  const handleReorder = async (order: OrderDetailResponse) => {
    if (!order.items || order.items.length === 0) return;
    setReorderingId(order.id);
    try {
      for (const item of order.items) {
        const variantId = item.variantId || item.productId;
        if (variantId) {
          await addToCartMutation.mutateAsync({
            variantId: String(variantId),
            quantity: item.quantity || 1,
          });
        }
      }
      setReorderSuccessId(order.id);
      setTimeout(() => setReorderSuccessId(null), 4000);
    } catch (err) {
      console.error("Failed to reorder items into cart:", err);
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-theme-text-secondary">
            My Orders
          </h2>
          {!isLoading && orders.length > 0 && (
            <p className="text-xs text-theme-text-muted mt-0.5">
              {orders.length} order{orders.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
        {/* Filters Row */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="w-full sm:w-56">
            <SearchInput
              placeholder="Search order number..."
              onSearch={(val) => setSearchQuery(val)}
              debounceMs={400}
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={STATUS_OPTIONS}
              placeholder="Filter by Status"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        /* Shimmer Loading State */
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="px-5 py-4 bg-theme-surface-alt border-b border-theme-border-subtle flex justify-between items-center">
                <div className="flex gap-6">
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-12 rounded skeleton-shimmer" />
                    <div className="h-4 w-28 rounded skeleton-shimmer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-10 rounded skeleton-shimmer" />
                    <div className="h-4 w-20 rounded skeleton-shimmer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-10 rounded skeleton-shimmer" />
                    <div className="h-4 w-16 rounded skeleton-shimmer" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full skeleton-shimmer" />
              </div>
              <div className="p-5 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg skeleton-shimmer flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 rounded skeleton-shimmer" />
                      <div className="h-3 w-24 rounded skeleton-shimmer" />
                    </div>
                    <div className="h-4 w-14 rounded skeleton-shimmer" />
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
                <div className="h-9 w-20 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-theme-text-muted">Failed to load your orders.</p>
          <button
            type="button"
            onClick={handleRefetch}
            className="bg-theme-primary text-theme-primary-fg px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 sm:p-14 text-center shadow-2xs overflow-hidden max-w-full">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-theme-surface-alt border-2 border-dashed border-theme-border-accent flex items-center justify-center">
            <Package className="w-9 h-9 text-theme-primary/50" />
          </div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-theme-text-secondary max-w-full break-words [overflow-wrap:anywhere] px-2">
            {searchQuery ? (
              <span>
                No orders matching{" "}
                <span className="text-theme-primary font-black break-all inline">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </span>
            ) : selectedStatus !== "all" ? (
              `No ${selectedStatus.replace(/_/g, " ")} orders`
            ) : (
              "No orders yet"
            )}
          </h3>
          <p className="text-xs sm:text-sm text-theme-text-muted max-w-sm mx-auto mt-3 mb-6 leading-relaxed break-words [overflow-wrap:anywhere]">
            {searchQuery
              ? "Try a different order number or clear your search."
              : selectedStatus !== "all"
              ? `You don't have any orders currently marked as "${selectedStatus.replace(/_/g, " ")}".`
              : "Your murukku is waiting. Browse our handcrafted festive snacks and your orders will show up here."}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="bg-theme-secondary hover:bg-theme-secondary-hover text-theme-secondary-fg text-xs font-semibold uppercase tracking-wider py-3.5 px-7 rounded-lg transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Clear Search
            </button>
          ) : selectedStatus !== "all" ? (
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className="bg-theme-secondary hover:bg-theme-secondary-hover text-theme-secondary-fg text-xs font-semibold uppercase tracking-wider py-3.5 px-7 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              View All Orders
            </button>
          ) : (
            <Link href="/products">
              <button
                type="button"
                className="bg-theme-secondary hover:bg-theme-secondary-hover text-theme-secondary-fg text-xs font-semibold uppercase tracking-wider py-3.5 px-7 rounded-lg transition-colors cursor-pointer min-h-[44px]"
              >
                Start Shopping
              </button>
            </Link>
          )}
        </div>
      ) : (
        /* Orders List */
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const isOngoing = order.status !== "delivered" && order.status !== "cancelled" && order.status !== "returned";
            const isReordering = reorderingId === order.id;
            const isReordered = reorderSuccessId === order.id;
            const statusMeta = getStatusMeta(order.status);
            const itemCount = order.items?.length ?? 0;

            return (
              <div
                key={order.id}
                className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm hover:border-theme-border-accent transition-all duration-200"
              >
                {/* Card Header Bar */}
                <div className="flex justify-between items-center gap-4 flex-wrap px-5 py-3.5 bg-theme-surface-alt border-b border-theme-border-subtle">
                  <div className="flex items-center gap-5 sm:gap-7 flex-wrap">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-theme-text-muted">
                        Order
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-theme-text-primary mt-0.5 font-mono">
                        {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-theme-text-muted">
                        Placed
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-theme-text-primary mt-0.5">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "\u2014"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-theme-text-muted">
                        Total
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-theme-primary mt-0.5">
                        {formatPrice(order.totalAmount)}
                      </div>
                    </div>

                    {itemCount > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-theme-text-muted">
                          Items
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-theme-text-primary mt-0.5">
                          {itemCount}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {order.delivery?.trackingNumber && (
                      <button
                        type="button"
                        onClick={() =>
                          setLiveCourierTracking({
                            trackingNumber: order.delivery?.trackingNumber || "",
                            courierName: order.delivery?.deliveryPartner?.name || "ST Courier",
                            orderNumber: order.orderNumber,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Live ST Courier Tracking"
                      >
                        <Navigation className="h-3 w-3 text-blue-600" />
                        <span>ST Courier: {order.delivery.trackingNumber}</span>
                      </button>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${statusMeta.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusMeta.dot}`} />
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="px-5 py-4 flex flex-col divide-y divide-theme-border-subtle">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => {
                      const itemImg =
                        it.primaryImage ||
                        (it as { image?: string; productImage?: string; imageUrl?: string }).image ||
                        (it as { image?: string; productImage?: string; imageUrl?: string }).productImage ||
                        (it as { image?: string; productImage?: string; imageUrl?: string }).imageUrl ||
                        null;

                      return (
                        <div key={idx} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 overflow-hidden border border-theme-border-subtle bg-theme-surface-alt shadow-2xs">
                            <ProductImage
                              src={itemImg ? getImageUrl(itemImg) : null}
                              alt={it.productName || "Snack"}
                              fallbackText={it.productName || "Snack"}
                              containerClassName="w-full h-full"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-theme-text-primary truncate">
                              {it.productName || "Snack Item"}
                            </div>
                            <div className="text-[11px] text-theme-text-muted mt-0.5 flex items-center gap-2">
                              {it.quantity && <span>Qty: {it.quantity}</span>}
                              {it.variantName && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-theme-border inline-block" />
                                  <span>{it.variantName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-theme-primary flex-shrink-0">
                            {formatPrice(it.totalPrice ?? it.unitPrice ?? 0)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-theme-text-muted py-3">
                      Order details available in invoice.
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="px-5 pb-4 pt-1 flex items-center gap-2.5 flex-wrap border-t border-theme-border-subtle">
                  {order.delivery?.trackingNumber && (
                    <button
                      type="button"
                      onClick={() =>
                        setLiveCourierTracking({
                          trackingNumber: order.delivery?.trackingNumber || "",
                          courierName: order.delivery?.deliveryPartner?.name || "ST Courier",
                          orderNumber: order.orderNumber,
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all cursor-pointer min-h-[40px] inline-flex items-center gap-2 shadow-xs"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      <span>Live ST Courier</span>
                    </button>
                  )}

                  {isOngoing ? (
                    <button
                      type="button"
                      onClick={() => setTrackingOrder(order)}
                      className="bg-theme-primary hover:bg-theme-primary-hover text-theme-primary-fg text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                    >
                      Track Order
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isReordering}
                      onClick={() => handleReorder(order)}
                      className={`text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer min-h-[40px] ${
                        isReordered
                          ? "bg-green-600 text-white"
                          : "bg-theme-primary hover:bg-theme-primary-hover text-theme-primary-fg"
                      } disabled:opacity-50`}
                    >
                      {isReordering ? (
                        "Adding to Cart..."
                      ) : isReordered ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Added to Cart
                        </span>
                      ) : (
                        "Reorder"
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      window.open(`/invoice/${order.id}`, "_blank", "noopener")
                    }
                    className="border border-theme-border hover:bg-theme-surface-alt text-theme-text-subtle text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                  >
                    Invoice
                  </button>

                  <Link href="/contact">
                    <button
                      type="button"
                      className="border border-theme-border hover:bg-theme-surface-alt text-theme-text-subtle text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer min-h-[40px]"
                    >
                      Need Help
                    </button>
                  </Link>

                  {order.status === "pending" && (
                    <button
                      type="button"
                      disabled={cancelMutation.isPending}
                      onClick={() => setOrderToCancel(order)}
                      className="border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg transition-colors cursor-pointer min-h-[40px] disabled:opacity-50 ml-auto"
                    >
                      {cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Interactive Order Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-theme-surface border border-theme-border rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-theme-border-subtle pb-4">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-theme-text-muted">
                  Live Shipment Tracking
                </div>
                <h3 className="text-lg font-bold text-theme-text-primary mt-0.5">
                  Order {trackingOrder.orderNumber || `#${String(trackingOrder.id).slice(0, 8)}`}
                </h3>
                {(() => {
                  const m = getStatusMeta(trackingOrder.status);
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border mt-1 ${m.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      {trackingOrder.status.replace(/_/g, " ")}
                    </span>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => setTrackingOrder(null)}
                className="w-8 h-8 rounded-full border border-theme-border flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-surface-alt transition-colors cursor-pointer flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* ST Courier Live Checkpoints Quick Action Banner */}
            {trackingOrder.delivery?.trackingNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-blue-900">Shipped via ST Courier: </span>
                    <span className="font-mono text-blue-800 font-semibold">{trackingOrder.delivery.trackingNumber}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const t = trackingOrder;
                    setTrackingOrder(null);
                    setLiveCourierTracking({
                      trackingNumber: t.delivery?.trackingNumber || "",
                      courierName: t.delivery?.deliveryPartner?.name || "ST Courier",
                      orderNumber: t.orderNumber,
                    });
                  }}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  View Live Checkpoints
                </button>
              </div>
            )}

            {/* Stepper Visual (4 Breakpoints: Placed -> Packed -> Out for Delivery -> Delivered / Returned / Cancelled) */}
            {(() => {
              const isDelivered = trackingOrder.status?.toLowerCase() === "delivered";
              const isReturned = trackingOrder.status?.toLowerCase() === "returned";
              const isCancelled = trackingOrder.status?.toLowerCase() === "cancelled";

              const finalStepLabel = isReturned
                ? "Returned"
                : isCancelled
                ? "Cancelled"
                : "Delivered";

              const finalStepDesc = isDelivered
                ? "Delivered successfully"
                : isReturned
                ? "Returned & Refunded"
                : isCancelled
                ? "Order Cancelled"
                : "Expected soon";

              const modalSteps = [
                {
                  label: "Placed",
                  desc: trackingOrder.createdAt
                    ? new Date(trackingOrder.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                    : "Received",
                  isCancel: false,
                  isReturn: false,
                },
                {
                  label: "Packed",
                  desc:
                    getTrackingStepIndex(trackingOrder.status) >= 1
                      ? trackingOrder.status === "packed"
                        ? "Packed & Ready"
                        : "Processing"
                      : "Pending",
                  isCancel: false,
                  isReturn: false,
                },
                {
                  label: "Out for Delivery",
                  desc:
                    getTrackingStepIndex(trackingOrder.status) >= 2
                      ? trackingOrder.status === "out_for_delivery"
                        ? "On the way"
                        : "Dispatched"
                      : "Pending",
                  isCancel: false,
                  isReturn: false,
                },
                {
                  label: finalStepLabel,
                  desc: finalStepDesc,
                  isCancel: isCancelled,
                  isReturn: isReturned,
                },
              ];

              const currentStep = getTrackingStepIndex(trackingOrder.status);

              return (
                <div className="bg-theme-surface-alt rounded-xl p-4 sm:p-5 border border-theme-border-subtle">
                  <div className="grid grid-cols-4 gap-0 items-start">
                    {modalSteps.map((step, idx) => {
                      const isDone = idx <= currentStep;
                      const isActive = idx === currentStep;
                      const isLast = idx === modalSteps.length - 1;

                      const dotColor =
                        isLast && step.isCancel
                          ? "bg-red-500 ring-2 ring-red-100"
                          : isLast && step.isReturn
                          ? "bg-purple-600 ring-2 ring-purple-100"
                          : isDone
                          ? "bg-emerald-500 ring-2 ring-emerald-100"
                          : isActive
                          ? "bg-theme-secondary ring-2 ring-theme-secondary/20"
                          : "bg-theme-border";

                      const lineColor = idx < currentStep ? "bg-emerald-400" : "bg-theme-border";

                      return (
                        <div key={step.label} className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                          <div className="flex items-center">
                            <span
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex-shrink-0 transition-all ${dotColor}`}
                            />
                            {!isLast && (
                              <span className={`h-0.5 flex-1 transition-colors ${lineColor}`} />
                            )}
                          </div>
                          <div
                            className={`text-[11px] sm:text-xs font-semibold leading-tight pr-0.5 truncate ${
                              isDone || isActive ? "text-theme-text-primary" : "text-theme-text-muted"
                            }`}
                            title={step.label}
                          >
                            {step.label}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-theme-text-muted pr-0.5 line-clamp-2">
                            {step.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Delivery Address Snapshot */}
            {trackingOrder.shippingAddress && (
              <div className="space-y-1.5 text-xs bg-theme-surface-warm p-4 rounded-xl border border-theme-border-subtle">
                <div className="font-semibold text-theme-text-primary uppercase tracking-wider text-[11px]">
                  Delivery Address
                </div>
                <div className="text-theme-text-primary font-medium">
                  {trackingOrder.shippingAddress.fullName || trackingOrder.shippingAddress.addressLine1}
                </div>
                <div className="text-theme-text-muted">
                  {[
                    trackingOrder.shippingAddress.addressLine1,
                    trackingOrder.shippingAddress.addressLine2,
                    trackingOrder.shippingAddress.city,
                    trackingOrder.shippingAddress.state,
                    trackingOrder.shippingAddress.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}

            {/* Items Summary in Modal */}
            <div className="space-y-2">
              <div className="font-semibold text-xs text-theme-text-muted uppercase tracking-wider">
                Order Items ({trackingOrder.items?.length || 0})
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {trackingOrder.items?.map((it, idx) => {
                  const itemImg =
                    it.primaryImage ||
                    (it as { image?: string; productImage?: string; imageUrl?: string }).image ||
                    (it as { image?: string; productImage?: string; imageUrl?: string }).productImage ||
                    (it as { image?: string; productImage?: string; imageUrl?: string }).imageUrl ||
                    null;

                  return (
                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-theme-border-subtle last:border-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-theme-border-subtle bg-theme-surface-alt flex-shrink-0">
                        <ProductImage
                          src={itemImg ? getImageUrl(itemImg) : null}
                          alt={it.productName || "Snack"}
                          fallbackText={it.productName}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-theme-text-primary font-medium flex-1 truncate">
                        {it.productName} {it.variantName ? `(${it.variantName})` : ""} × {it.quantity}
                      </span>
                      <span className="font-semibold text-xs text-theme-primary flex-shrink-0">
                        {formatPrice(it.totalPrice ?? it.unitPrice ?? 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTrackingOrder(null)}
                className="bg-theme-secondary hover:bg-theme-secondary-hover text-theme-secondary-fg text-xs font-semibold uppercase tracking-wider py-2.5 px-6 rounded-lg transition-colors cursor-pointer min-h-[40px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmDialog
        open={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={() => {
          if (orderToCancel) {
            cancelMutation.mutate({
              uuid: orderToCancel.id,
              payload: { note: "Cancelled by customer" },
            });
            setOrderToCancel(null);
          }
        }}
        title="Cancel Order?"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />

      {/* Live ST Courier Tracking Modal */}
      {liveCourierTracking && (
        <LiveTrackingModal
          open={Boolean(liveCourierTracking)}
          onClose={() => setLiveCourierTracking(null)}
          trackingNumber={liveCourierTracking.trackingNumber}
          courierName={liveCourierTracking.courierName}
          orderNumber={liveCourierTracking.orderNumber}
        />
      )}
    </div>
  );
}
