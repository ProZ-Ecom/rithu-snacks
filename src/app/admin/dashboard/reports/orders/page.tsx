"use client";

import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/PageContainer";
import {
  CHART_COLORS,
  type Column,
  DataTable,
  ExportButton,
  IdBadge,
  MetricCard,
  Note,
  Panel,
  RangeCaption,
  ReportError,
  ReportFilters,
  ReportSkeleton,
  ShareBar,
  StatusBadge,
  TrendChart,
  compareLabelFor,
  count,
  dateLabel,
  days,
  formatCsvDateTime,
  money,
  moneyExact,
  percent,
} from "@/features/reports/components/report-ui";
import { reportErrorMessage, useReport } from "@/features/reports/hooks/use-report";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "@/features/reports/lib/report-labels";
import type {
  OrderListRow,
  OrdersReport,
  ReasonRow,
  StatusRow,
} from "@/features/reports/services/orders-report.service";

const statusColumns = (header: string): Column<StatusRow>[] => [
  { header, cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "Orders", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "Value", align: "right", cell: (r) => moneyExact(r.value), csv: (r) => r.value },
  { header: "Share", align: "right", cell: (r) => <ShareBar share={r.share} />, csv: (r) => r.share },
];

const reasonColumns = (byHeader: string, showValue = true): Column<ReasonRow>[] => [
  { header: "Reason", cell: (r) => <span className="font-medium text-stone-900">{r.reason}</span>, csv: (r) => r.reason },
  { header: byHeader, cell: (r) => humanise(r.by), csv: (r) => humanise(r.by) },
  { header: "Requests", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  ...(showValue
    ? [
        {
          header: "Value",
          align: "right" as const,
          cell: (r: ReasonRow) => moneyExact(r.value),
          csv: (r: ReasonRow) => r.value,
        },
      ]
    : []),
];

function humanise(value: string) {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const orderColumns: Column<OrderListRow>[] = [
  {
    header: "ORDER ID",
    cell: (r) => <IdBadge>{r.orderNumber}</IdBadge>,
    csv: (r) => r.orderNumber,
  },
  {
    header: "CUSTOMER",
    cell: (r) => <span className="font-medium text-stone-800">{r.customer}</span>,
    csv: (r) => r.customer,
  },
  {
    header: "STATUS",
    cell: (r) => <StatusBadge status={r.status} />,
    csv: (r) => r.status,
  },
  {
    header: "PAYMENT",
    cell: (r) => <StatusBadge status={r.paymentStatus} />,
    csv: (r) => r.paymentStatus,
  },
  {
    header: "ITEMS",
    align: "right",
    cell: (r) => <span className="text-xs font-medium text-stone-700">{count(r.items)}</span>,
    csv: (r) => r.items,
  },
  {
    header: "TOTAL AMOUNT",
    align: "right",
    cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.value)}</span>,
    csv: (r) => r.value,
  },
  {
    header: "DELIVERED IN",
    align: "right",
    cell: (r) => (
      <span className="text-xs text-stone-600">
        {r.deliveryDays == null ? "—" : r.deliveryDays < 1 ? "Same day" : days(r.deliveryDays)}
      </span>
    ),
    csv: (r) => r.deliveryDays,
  },
  {
    header: "PLACED AT",
    cell: (r) => (
      <div className="leading-snug text-xs text-stone-700">
        <div>{dateLabel(r.placedAt)}</div>
        <div className="text-[11px] text-stone-400">
          {r.placedAt ? new Date(r.placedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </div>
    ),
    csv: (r) => formatCsvDateTime(r.placedAt),
  },
];

const orderTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", filter: (r: OrderListRow) => r.status === "pending" },
  { key: "confirmed", label: "Confirmed", filter: (r: OrderListRow) => r.status === "confirmed" },
  { key: "processing", label: "Processing", filter: (r: OrderListRow) => r.status === "processing" },
  { key: "packed", label: "Packed", filter: (r: OrderListRow) => r.status === "packed" },
  { key: "shipped", label: "Shipped", filter: (r: OrderListRow) => r.status === "shipped" },
  { key: "delivered", label: "Delivered", filter: (r: OrderListRow) => r.status === "delivered" },
  { key: "cancelled", label: "Cancelled", filter: (r: OrderListRow) => r.status === "cancelled" },
];

export default function OrdersReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<OrdersReport>(
    "/api/admin/reports/orders"
  );

  const compare = data ? compareLabelFor(data.range.days) : undefined;

  return (
    <PageContainer
      title="Orders Report"
      description="Where orders sit in the pipeline, how fast they get delivered, and why they fall through."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Orders Report" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard/reports">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <ArrowLeft className="h-3.5 w-3.5" />
              All Reports
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {data?.orders && data.orders.length > 0 && (
            <ExportButton
              rows={data.orders}
              columns={orderColumns}
              fileName="orders_report"
              label="Export Excel"
            />
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Panel>
          <ReportFilters
            value={filters}
            onChange={setFilters}
            extras={[
              { name: "status", label: "Order status", options: ORDER_STATUS_OPTIONS },
              { name: "paymentStatus", label: "Payment status", options: PAYMENT_STATUS_OPTIONS },
            ]}
          />
        </Panel>

        {error ? (
          <ReportError message={reportErrorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <ReportSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <RangeCaption from={data.range.from} to={data.range.to} days={data.range.days} />
              {isFetching && <span className="text-xs text-stone-400">Updating…</span>}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricCard
                label="PLACED ORDERS"
                value={count(data.totals.orders)}
                hint="Total orders created in period"
                delta={data.changes.orders}
                compareLabel={compare}
                icon={ShoppingCart}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="DELIVERED"
                value={count(data.totals.delivered)}
                hint={`${percent(data.totals.fulfilmentRate)} completion rate`}
                delta={data.changes.delivered}
                compareLabel={compare}
                icon={CheckCircle2}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="CANCELLED"
                value={count(data.totals.cancelled)}
                hint={`${percent(data.totals.cancelRate)} cancellation rate`}
                delta={data.changes.cancelled}
                compareLabel={compare}
                icon={XCircle}
                tone="warn"
                accentBorder="border-l-rose-600"
              />
              <MetricCard
                label="AVG DELIVERY TIME"
                value={days(data.totals.avgDeliveryDays)}
                hint="From placed to delivered"
                delta={data.changes.avgDeliveryDays}
                compareLabel={compare}
                icon={Clock}
                accentBorder="border-l-amber-600"
              />
            </div>

            {/* Volume Trend (matches Dashboard Spline Graph) */}
            <Panel
              title="Order Volume Trend"
              hint={`Order intake versus deliveries in this window · Total: ${count(data.totals.orders)} placed`}
            >
              <TrendChart
                data={data.trend}
                bucket={data.range.bucket}
                format={(n) => `${n} orders`}
                series={[
                  { key: "placed", label: "Placed", value: (r) => r.placed, color: CHART_COLORS.primary },
                  { key: "delivered", label: "Delivered", value: (r) => r.delivered, color: CHART_COLORS.emerald },
                  { key: "cancelled", label: "Cancelled", value: (r) => r.cancelled, color: CHART_COLORS.rose },
                ]}
              />
            </Panel>

            {/* Order Pipeline Table with Segmented Status Tabs, Maroon Header & Excel Export */}
            <Panel
              title="Order Activity"
              hint={
                data.ordersTruncated
                  ? "Recent orders in this window (capped at 500)"
                  : "All orders recorded in this window"
              }
            >
              <DataTable
                rows={data.orders}
                columns={orderColumns}
                rowKey={(r) => r.id}
                tabs={orderTabs}
                counterBadge={`${data.orders.length} orders`}
                searchPlaceholder="Search order number or customer name..."
                exportFileName="order_activity"
                empty="No orders found in this period."
                defaultPageSize={20}
              />
            </Panel>

            {/* Pipeline Stage Breakdown */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Current Order Status"
                hint="Distribution across fulfillment stages"
              >
                <DataTable
                  rows={data.byStatus}
                  columns={statusColumns("Status")}
                  rowKey={(r) => r.status}
                  searchPlaceholder="Filter status..."
                  exportFileName="orders_by_status"
                  empty="No orders in this period."
                />
              </Panel>

              <Panel
                title="Payment Status"
                hint="Settlement status breakdown"
              >
                <DataTable
                  rows={data.byPaymentStatus}
                  columns={statusColumns("Payment Status")}
                  rowKey={(r) => r.status}
                  searchPlaceholder="Filter payment status..."
                  exportFileName="orders_by_payment_status"
                  empty="No payment data in this period."
                />
              </Panel>
            </div>

            {/* Reasons for Drop-off */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Cancellation Reasons"
                hint="Why orders did not go through"
              >
                <DataTable
                  rows={data.cancellationReasons}
                  columns={reasonColumns("Cancelled By")}
                  rowKey={(r) => `${r.by}-${r.reason}`}
                  exportFileName="cancellation_reasons"
                  empty="No cancellations recorded in this period."
                  emptyHint="All orders either progressed or are still open."
                />
              </Panel>

              <Panel
                title="Return Reasons"
                hint="Why delivered items were returned"
              >
                <DataTable
                  rows={data.returnReasons}
                  columns={reasonColumns("Role", false)}
                  rowKey={(r) => `${r.by}-${r.reason}`}
                  exportFileName="return_reasons"
                  empty="No returns recorded in this period."
                  emptyHint="Every completed delivery stayed with the customer."
                />
              </Panel>
            </div>

            <Note>
              Average delivery time counts only completed deliveries from order creation to delivery mark. Orders currently in-transit or pending dispatch are not counted in the delivery average.
            </Note>
          </>
        )}
      </div>
    </PageContainer>
  );
}
