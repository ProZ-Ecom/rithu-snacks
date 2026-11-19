"use client";

import React, { useCallback } from "react";
import {
  ArrowLeft,
  CreditCard,
  IndianRupee,
  Receipt,
  RefreshCw,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/PageContainer";
import {
  CHART_COLORS,
  type Column,
  DataTable,
  IdBadge,
  MetricCard,
  Note,
  Panel,
  RangeCaption,
  ReportError,
  ReportFilters,
  ReportSkeleton,
  StatusBadge,
  TrendChart,
  compareLabelFor,
  count,
  dateLabel,
  formatCsvDateTime,
  money,
  moneyExact,
  percent,
} from "@/features/reports/components/report-ui";
import { reportErrorMessage, useReport, useReportOptions } from "@/features/reports/hooks/use-report";
import type {
  OutstandingRow,
  PaymentMethodRow,
  PaymentStatusRow,
  RevenueReport,
  TaxRow,
} from "@/features/reports/services/revenue-report.service";

const taxColumns: Column<TaxRow>[] = [
  { header: "HSN Code", cell: (r) => <span className="font-mono text-xs font-semibold text-stone-900">{r.hsnCode}</span>, csv: (r) => r.hsnCode },
  { header: "Description", cell: (r) => <span className="text-stone-700">{r.description}</span>, csv: (r) => r.description },
  { header: "GST Slab", cell: (r) => <span className="font-medium text-stone-800">{r.gstName}</span>, csv: (r) => r.gstName },
  { header: "CGST %", align: "right", cell: (r) => percent(r.cgst), csv: (r) => r.cgst },
  { header: "SGST %", align: "right", cell: (r) => percent(r.sgst), csv: (r) => r.sgst },
  { header: "IGST %", align: "right", cell: (r) => percent(r.igst), csv: (r) => r.igst },
  { header: "Units", align: "right", cell: (r) => count(r.units), csv: (r) => r.units },
  { header: "Taxable Value", align: "right", cell: (r) => moneyExact(r.taxableValue), csv: (r) => r.taxableValue },
  { header: "Tax Amount", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.taxAmount)}</span>, csv: (r) => r.taxAmount },
];

const methodColumns: Column<PaymentMethodRow>[] = [
  { header: "Payment Method", cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "Payments", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "Collected", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.amount)}</span>, csv: (r) => r.amount },
];

const statusColumns: Column<PaymentStatusRow>[] = [
  { header: "Payment Status", cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "Orders", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "Order Value", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.value)}</span>, csv: (r) => r.value },
];

const outstandingColumns: Column<OutstandingRow>[] = [
  { header: "ORDER ID", cell: (r) => <IdBadge>{r.orderNumber}</IdBadge>, csv: (r) => r.orderNumber },
  { header: "PLACED AT", cell: (r) => dateLabel(r.placedAt), csv: (r) => formatCsvDateTime(r.placedAt) },
  { header: "CUSTOMER", cell: (r) => <span className="font-medium text-stone-800">{r.customer}</span>, csv: (r) => r.customer },
  { header: "ORDER STATUS", cell: (r) => <StatusBadge status={r.status} />, csv: (r) => r.status },
  { header: "ORDER VALUE", align: "right", cell: (r) => moneyExact(r.value), csv: (r) => r.value },
  { header: "RECEIVED", align: "right", cell: (r) => moneyExact(r.paid), csv: (r) => r.paid },
  {
    header: "STILL DUE",
    align: "right",
    cell: (r) => <span className="font-bold text-rose-700">{moneyExact(r.due)}</span>,
    csv: (r) => r.due,
  },
];

const outstandingTabs = [
  { key: "all", label: "All Outstanding" },
  { key: "partial", label: "Partially Paid", filter: (r: OutstandingRow) => r.paid > 0 },
  { key: "zero", label: "Zero Paid", filter: (r: OutstandingRow) => r.paid === 0 },
];

export default function RevenueReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<RevenueReport>(
    "/api/admin/reports/revenue"
  );
  const { data: options } = useReportOptions();

  const compare = data ? compareLabelFor(data.range.days) : undefined;
  const taxTotal = data?.tax.reduce((s, r) => s + r.taxAmount, 0) ?? 0;
  const unmapped = data?.tax.find((r) => r.hsnCode === "Not mapped");

  const handleExportAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.tab) params.set("tab", filters.tab);
    params.set("page", "1");
    params.set("limit", "5000");

    const res = await fetch(`/api/admin/reports/revenue?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to export full revenue dataset");
    const json = await res.json();
    return (json.data?.outstanding ?? []) as OutstandingRow[];
  }, [filters]);

  return (
    <PageContainer
      title="Revenue Report"
      description="What was billed, what has actually been collected, and what is still owed."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Revenue Report" },
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
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Panel>
          <ReportFilters
            value={filters}
            onChange={setFilters}
            extras={[
              { name: "paymentMethod", label: "Payment Method", options: options?.paymentMethods ?? [] },
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
                label="GROSS SALES"
                value={money(data.totals.grossSales)}
                hint="Before discount, coupons & tax"
                delta={data.changes.grossSales}
                compareLabel={compare}
                icon={IndianRupee}
                accentBorder="border-l-amber-600"
              />
              <MetricCard
                label="NET REVENUE"
                value={money(data.totals.netRevenue)}
                hint="Final billed invoice total"
                delta={data.changes.netRevenue}
                compareLabel={compare}
                icon={IndianRupee}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="COLLECTED"
                value={money(data.totals.collected)}
                hint="Received through online gateways"
                delta={data.changes.collected}
                compareLabel={compare}
                icon={Wallet}
                tone="good"
                accentBorder="border-l-teal-600"
              />
              <MetricCard
                label="OUTSTANDING"
                value={money(data.totals.outstanding)}
                hint="COD pending & unpaid orders"
                delta={data.changes.outstanding}
                compareLabel={compare}
                icon={CreditCard}
                tone="warn"
                accentBorder="border-l-rose-600"
              />
              <MetricCard
                label="TOTAL TAX / GST"
                value={money(data.totals.tax)}
                hint="GST collected in period"
                delta={data.changes.tax}
                compareLabel={compare}
                icon={Receipt}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="COUPONS & OFFERS"
                value={money(data.totals.coupons + data.totals.discount)}
                hint="Discounts granted to shoppers"
                delta={data.changes.discount}
                compareLabel={compare}
                accentBorder="border-l-secondary-600"
              />
              <MetricCard
                label="SHIPPING REVENUE"
                value={money(data.totals.shipping)}
                hint="Courier & delivery charges"
                delta={data.changes.shipping}
                compareLabel={compare}
                icon={Truck}
                accentBorder="border-l-amber-600"
              />
              <MetricCard
                label="TOTAL REFUNDS"
                value={money(data.totals.refunded)}
                hint="Paid back on returns/cancellations"
                delta={data.changes.refunded}
                compareLabel={compare}
                accentBorder="border-l-rose-600"
              />
            </div>

            {/* Revenue Trend */}
            <Panel
              title="Revenue Progression"
              hint={`Daily revenue velocity over this period · Total: ${money(data.totals.netRevenue)}`}
            >
              <TrendChart
                data={data.trend}
                bucket={data.range.bucket}
                format={(n) => money(n)}
                series={[
                  { key: "net", label: "Net Revenue", value: (r) => r.netRevenue, color: CHART_COLORS.primary },
                  { key: "tax", label: "Tax", value: (r) => r.tax, color: CHART_COLORS.teal },
                  { key: "disc", label: "Discount", value: (r) => r.discount, color: CHART_COLORS.amber },
                ]}
              />
            </Panel>

            {/* HSN-wise GST Summary */}
            <DataTable
              title="HSN-wise GST Breakdown"
              hint={`Tax compliance breakdown for GST filing · Total Tax: ${money(taxTotal)}`}
              counterBadge={`${data.tax.length} slabs`}
              rows={data.tax}
              columns={taxColumns}
              rowKey={(r) => r.hsnCode}
              exportFileName="tax_breakdown"
              empty="No taxable sales recorded in this period."
              paginate={false}
            />

            {/* Unpaid / Outstanding Orders Table with Segmented Tabs, Maroon Header & Excel Export */}
            <DataTable
              title="Outstanding / Pending Payments"
              hint="All orders where payment has not been fully cleared"
              serverSide={true}
              rows={data.outstanding}
              columns={outstandingColumns}
              rowKey={(r) => r.id}
              tabs={outstandingTabs}
              activeTabKey={filters.tab || "all"}
              onTabChange={(tab) =>
                setFilters((prev) => ({ ...prev, tab: tab === "all" ? "" : tab, page: "1" }))
              }
              counterBadge={`${data.pagination?.total ?? data.outstanding.length} orders`}
              page={Number(filters.page || 1)}
              pageSize={Number(filters.limit || 10)}
              totalItems={data.pagination?.total ?? data.outstanding.length}
              totalPages={data.pagination?.totalPages ?? 1}
              onPageChange={(p) =>
                setFilters((prev) => ({ ...prev, page: String(p) }))
              }
              onPageSizeChange={(s) =>
                setFilters((prev) => ({ ...prev, limit: String(s), page: "1" }))
              }
              onExportAll={handleExportAll}
              exportFileName="outstanding_orders"
              empty="No outstanding amounts in this period."
              emptyHint="All completed orders have been fully paid."
              defaultPageSize={10}
              isLoading={isFetching}
            />

            {/* Payment Settlement Methods */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataTable
                title="Payment Methods"
                hint="Breakdown by collection channel"
                counterBadge={`${data.paymentMethods.length} methods`}
                rows={data.paymentMethods}
                columns={methodColumns}
                rowKey={(r) => r.code}
                exportFileName="payment_methods"
                empty="No payment methods recorded in this period."
                paginate={false}
              />

              <DataTable
                title="Payment Status Rollup"
                hint="Total invoiced value by payment status"
                counterBadge={`${data.paymentStatus.length} statuses`}
                rows={data.paymentStatus}
                columns={statusColumns}
                rowKey={(r) => r.status}
                exportFileName="payment_status_rollup"
                empty="No payment status data in this period."
                paginate={false}
              />
            </div>

            {unmapped && unmapped.taxAmount > 0 && (
              <Note tone="warn">
                There are items sold without an HSN code mapped ({money(unmapped.taxAmount)} of tax recorded). Map them under Catalog &gt; Products so your GSTR-1 export stays compliant.
              </Note>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
