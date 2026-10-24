"use client";

import { useState } from "react";
import {
  MapPin,
  CreditCard,
  Truck,
  CalendarDays,
  User,
  Clock,
  FileText,
  Loader2,
  Package,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Check,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { OrderItemsList } from "./OrderItemsList";
import { OrderTotals } from "./OrderTotals";
import { LiveTrackingModal } from "./LiveTrackingModal";
import type { OrderDetailResponse, OrderDetail } from "../types";

interface OrderDetailViewProps {
  order: OrderDetailResponse | OrderDetail;
  onCancel?: () => void;
  isCancelling?: boolean;
  canCancel?: boolean;
}

function getStatusBadgeMeta(status?: string) {
  switch (status?.toLowerCase()) {
    case "delivered":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "cancelled":
      return {
        bg: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500",
      };
    case "returned":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
      };
    case "out_for_delivery":
    case "shipped":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "packed":
    case "processing":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    case "pending":
    case "confirmed":
      return {
        bg: "bg-orange-50 text-orange-700 border-orange-200",
        dot: "bg-orange-500",
      };
    default:
      return {
        bg: "bg-theme-surface-alt text-theme-text-muted border-theme-border",
        dot: "bg-theme-border",
      };
  }
}

export function OrderDetailView({
  order,
  onCancel,
  isCancelling = false,
  canCancel = false,
}: OrderDetailViewProps) {
  const [isLiveTrackingOpen, setIsLiveTrackingOpen] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const shippingAddress =
    ("shippingAddress" in order ? order.shippingAddress : (order as any).address) ||
    null;
  const billingAddress =
    ("billingAddress" in order ? order.billingAddress : null) || null;
  const customer = "customer" in order ? order.customer : (order as any).user;
  const shippingCharge =
    "shippingCharge" in order
      ? order.shippingCharge
      : (order as any).shippingAmount || 0;
  const statusHistory =
    "statusHistory" in order ? order.statusHistory || [] : [];
  const delivery = "delivery" in order ? order.delivery : (order as any).delivery;

  const statusMeta = getStatusBadgeMeta(order.status);
  const paymentStatus = (order as any).paymentStatus || (order as any).payment_status;

  const hasCourierTracking = Boolean(delivery?.trackingNumber);
  const courierPartnerName = delivery?.deliveryPartner?.name || "ST Courier";

  const handleCopyAwb = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2500);
  };

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="space-y-6">
      {/* Top Details Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-theme-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-theme-text-primary font-mono tracking-tight">
              {order.orderNumber}
            </h1>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-theme-text-subtle font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-theme-text-muted" />
            Placed on {formattedDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Order Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusMeta.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {String(order.status).replace(/_/g, " ")}
          </span>

          {/* Payment Status Badge */}
          {paymentStatus && (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                paymentStatus.toLowerCase() === "paid"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {paymentStatus}
            </span>
          )}

          {/* Invoice Action */}
          <Button
            variant="outline"
            size="sm"
            className="border-theme-border hover:bg-theme-surface-alt text-theme-text-primary rounded-xl text-xs font-semibold min-h-[36px]"
            onClick={() => window.open(`/invoice/${order.id}`, "_blank", "noopener")}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5 text-theme-secondary" />
            Invoice
          </Button>

          {/* Cancel Order Action */}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-700 border-red-200 hover:bg-red-50 rounded-xl text-xs font-semibold min-h-[36px]"
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Main Content (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Order Items Card */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
            <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-theme-text-primary flex items-center gap-2">
                <Package className="h-4 w-4 text-theme-secondary" />
                Order Items ({order.items?.length || 0})
              </h2>
            </div>
            <div className="p-5">
              <OrderItemsList items={order.items || []} />
            </div>
          </div>

          {/* 2. Three Info Cards: Customer, Address & Delivery/Courier */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Customer Details */}
            {customer && (
              <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
                <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-4 py-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-theme-secondary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-primary">
                    Customer Details
                  </h3>
                </div>
                <div className="p-4 text-xs space-y-1.5 text-theme-text-subtle">
                  <p className="font-bold text-theme-text-primary text-sm">
                    {customer.name || "Customer"}
                  </p>
                  {customer.customerId && (
                    <p className="font-mono text-[11px] text-theme-text-muted font-medium">
                      ID: {customer.customerId}
                    </p>
                  )}
                  {customer.email && (
                    <p className="flex items-center gap-1.5 truncate pt-0.5 text-theme-text-secondary font-medium">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-theme-text-muted" />
                      <span className="truncate">{customer.email}</span>
                    </p>
                  )}
                  {customer.phone && (
                    <p className="flex items-center gap-1.5 pt-0.5 text-theme-text-secondary font-medium">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-theme-text-muted" />
                      <span>{customer.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {shippingAddress && (
              <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
                <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-4 py-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-theme-secondary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-primary">
                    Delivery Address
                  </h3>
                </div>
                <div className="p-4 text-xs text-theme-text-subtle space-y-1.5">
                  <p className="font-bold text-theme-text-primary text-sm">
                    {shippingAddress.fullName}
                  </p>
                  <p className="line-clamp-2 text-theme-text-secondary font-medium leading-relaxed">
                    {shippingAddress.addressLine1}
                    {shippingAddress.addressLine2
                      ? `, ${shippingAddress.addressLine2}`
                      : ""}
                  </p>
                  {shippingAddress.landmark && (
                    <p className="text-[11px] text-theme-text-muted font-medium">
                      Landmark: {shippingAddress.landmark}
                    </p>
                  )}
                  <p className="text-theme-text-secondary font-medium">
                    {shippingAddress.city}, {shippingAddress.state}{" "}
                    {shippingAddress.pincode ? `- ${shippingAddress.pincode}` : ""}
                  </p>
                  <p className="text-theme-text-subtle font-medium">
                    {shippingAddress.country || "India"}
                  </p>
                  {shippingAddress.phone && (
                    <p className="flex items-center gap-1.5 text-theme-text-secondary font-medium pt-1">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-theme-text-muted" />
                      <span>{shippingAddress.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Dispatch Info: Courier OR In-House Staff */}
            {hasCourierTracking ? (
              <div className="rounded-2xl border border-blue-200 bg-linear-to-b from-blue-50/50 to-theme-surface shadow-2xs overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Courier Shipment
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white">
                    {courierPartnerName}
                  </span>
                </div>
                <div className="p-4 text-xs space-y-3 text-theme-text-subtle">
                  <div>
                    <p className="text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
                      Tracking / AWB Number
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-blue-200">
                      <span className="font-mono font-bold text-sm text-blue-900 tracking-wide select-all">
                        {delivery?.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAwb(delivery?.trackingNumber || "")}
                        className="p-1 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer"
                        title="Copy AWB number"
                      >
                        {copiedAwb ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {delivery?.shippedAt && (
                    <p className="text-[11px] text-theme-text-muted font-medium">
                      Dispatched on {formatDateTime(delivery.shippedAt)}
                    </p>
                  )}

                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLiveTrackingOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      <span>Live Courier Tracking</span>
                    </button>

                    <a
                      href={`https://stcourier.com/track/shipment?awb=${encodeURIComponent(
                        delivery?.trackingNumber || ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline pt-0.5"
                    >
                      <span>Open on ST Courier Portal</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
                <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-4 py-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-theme-secondary shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-primary">
                    Assigned Staff
                  </h3>
                </div>
                <div className="p-4 text-xs space-y-2 text-theme-text-subtle">
                  {delivery?.staff ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-theme-surface-alt border border-theme-border text-theme-primary text-xs font-bold shrink-0">
                          {delivery.staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-theme-text-primary truncate">
                            {delivery.staff.name}
                          </p>
                          {delivery.assignmentStatus && (
                            <div className="mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  delivery.assignmentStatus.toLowerCase() === "accepted"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : delivery.assignmentStatus.toLowerCase() === "rejected"
                                    ? "text-rose-700 bg-rose-50 border-rose-200"
                                    : "text-amber-700 bg-amber-50 border-amber-200"
                                }`}
                              >
                                {delivery.assignmentStatus.toLowerCase() === "accepted" ? (
                                  <>
                                    <Check className="h-2.5 w-2.5" />
                                    Accepted
                                  </>
                                ) : delivery.assignmentStatus.toLowerCase() === "rejected" ? (
                                  <>
                                    <XCircle className="h-2.5 w-2.5" />
                                    Rejected
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-2.5 w-2.5" />
                                    Pending
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {delivery.staff.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-theme-text-secondary font-medium">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-theme-text-muted" />
                          <span className="font-mono">{delivery.staff.phone}</span>
                        </p>
                      )}
                      {delivery.staff.email && (
                        <p className="text-xs truncate text-theme-text-secondary font-medium">
                          {delivery.staff.email}
                        </p>
                      )}
                      {delivery.assignedAt && (
                        <p className="text-[11px] text-theme-text-muted font-medium pt-1">
                          Assigned on {formatDateTime(delivery.assignedAt)}
                        </p>
                      )}

                      {delivery.assignmentStatus?.toLowerCase() === "rejected" && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          <p className="font-bold flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                            Staff Rejection Reason:
                          </p>
                          <p className="mt-1 text-[11px] text-rose-700">
                            {delivery.deliveryNotes || "Staff was unable to accept this delivery."}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-theme-text-muted bg-theme-surface-alt px-2.5 py-0.5 rounded-full border border-theme-border">
                        Pending Dispatch
                      </span>
                      <p className="text-xs text-theme-text-subtle font-medium mt-2 leading-relaxed">
                        No delivery staff assigned or courier dispatched yet. Order is being packaged.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Notes */}
          {order.notes && (
            <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
              <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-4 py-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-theme-secondary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-primary">
                  Order Notes & Instructions
                </h3>
              </div>
              <div className="p-4 text-xs text-theme-text-secondary">
                <p className="italic bg-theme-surface-warm p-3 rounded-xl border border-theme-border">
                  &ldquo;{order.notes}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Status History Timeline */}
          {statusHistory.length > 0 && (
            <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
              <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-5 py-3.5 flex items-center gap-2">
                <Clock className="h-4 w-4 text-theme-secondary" />
                <h3 className="text-sm font-bold text-theme-text-primary">
                  Order Timeline & Updates
                </h3>
              </div>
              <div className="p-5 space-y-3 divide-y divide-theme-border-subtle">
                {statusHistory.map((item, idx) => {
                  const itemStatusMeta = getStatusBadgeMeta(item.status);
                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-start gap-3 pt-3 first:pt-0 text-xs"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${itemStatusMeta.bg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${itemStatusMeta.dot}`} />
                        {item.status.replace(/_/g, " ")}
                      </span>

                      <div className="flex-1 min-w-0">
                        {item.note && (
                          <p className="text-theme-text-primary font-medium">
                            {item.note}
                          </p>
                        )}
                        <p className="text-[11px] text-theme-text-muted mt-0.5">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Order Totals Summary (Sticky) */}
        <div className="sticky top-24">
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden">
            <div className="bg-theme-surface-alt border-b border-theme-border-subtle px-5 py-3.5">
              <h2 className="text-sm sm:text-base font-bold text-theme-text-primary">
                Order Summary
              </h2>
            </div>
            <div className="p-5">
              <OrderTotals
                totals={{
                  subtotal: Number(order.subtotal || 0),
                  taxAmount: Number(order.taxAmount || 0),
                  shippingAmount: Number(shippingCharge || 0),
                  discountAmount: Number(order.discountAmount || 0),
                  totalAmount: Number(order.totalAmount || 0),
                }}
                couponLabel={order.couponCode}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live ST Courier Tracking Modal */}
      {delivery?.trackingNumber && (
        <LiveTrackingModal
          open={isLiveTrackingOpen}
          onClose={() => setIsLiveTrackingOpen(false)}
          trackingNumber={delivery.trackingNumber}
          courierName={courierPartnerName}
          orderNumber={order.orderNumber}
        />
      )}
    </div>
  );
}
