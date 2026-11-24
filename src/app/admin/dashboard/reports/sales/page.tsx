"use client";

import React, { useMemo, useCallback } from "react";
import {
  ArrowLeft,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingCart,
  Tag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/PageContainer";
import {
  CHART_COLORS,
  type Column,
  DataTable,
  MetricCard,
  Note,
  Panel,
  RangeCaption,
  ReportError,
  ReportFilters,
  ReportSkeleton,
  ShareBar,
  TrendChart,
  compareLabelFor,
  count,
  dateLabel,
  money,
  moneyExact,
} from "@/features/reports/components/report-ui";
import { reportErrorMessage, useReport, useReportOptions } from "@/features/reports/hooks/use-report";
import type { SalesBreakdownRow, SalesReport, SalesTrendPoint } from "@/features/reports/services/sales-report.service";

function breakdownColumns(firstHeader: string, showUnits = true): Column<SalesBreakdownRow>[] {
  return [
    { header: firstHeader, cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
    { header: "Orders", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
    ...(showUnits
      ? [
          {
            header: "Units",
            align: "right" as const,
            cell: (r: SalesBreakdownRow) => count(r.units),
            csv: (r: SalesBreakdownRow) => r.units,
          },
        ]
      : []),
    { header: "Sales", align: "right", cell: (r) => moneyExact(r.netSales), csv: (r) => r.netSales },
    { header: "Share", align: "right", cell: (r) => <ShareBar share={r.share} />, csv: (r) => r.share },
  ];
}

const dailyBreakdownColumns: Column<SalesTrendPoint>[] = [
  {
    header: "Date",
    cell: (r) => <span className="font-semibold text-stone-900">{dateLabel(r.bucket)}</span>,
    csv: (r) => dateLabel(r.bucket),
  },
  {
    header: "Orders",
    align: "right",
    cell: (r) => count(r.orders),
    csv: (r) => r.orders,
  },
  {
    header: "Items Sold",
    align: "right",
    cell: (r) => count(r.itemsSold),
    csv: (r) => r.itemsSold,
  },
  {
    header: "Gross Sales",
    align: "right",
    cell: (r) => moneyExact(r.grossSales),
    csv: (r) => r.grossSales,
  },
  {
    header: "Discounts",
    align: "right",
    cell: (r) =>
      r.discount && r.discount > 0 ? (
        <span className="text-amber-700 font-medium">-{moneyExact(r.discount)}</span>
      ) : (
        <span className="text-stone-400">—</span>
      ),
    csv: (r) => (r.discount ? -r.discount : 0),
  },
  {
    header: "GST / Tax",
    align: "right",
    cell: (r) => moneyExact(r.tax),
    csv: (r) => r.tax,
  },
  {
    header: "Shipping",
    align: "right",
    cell: (r) => moneyExact(r.shipping),
    csv: (r) => r.shipping,
  },
  {
    header: "Net Sales",
    align: "right",
    cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.netSales)}</span>,
    csv: (r) => r.netSales,
  },
];

const dailyTabs = [
  { key: "all", label: "All Days" },
  { key: "with_orders", label: "With Orders", filter: (r: SalesTrendPoint) => r.orders > 0 },
  { key: "high_sales", label: "High Sales (>₹500)", filter: (r: SalesTrendPoint) => r.netSales >= 500 },
];

export default function SalesReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<SalesReport>(
    "/api/admin/reports/sales"
  );
  const { data: options } = useReportOptions();

  const compare = data ? compareLabelFor(data.range.days) : undefined;

  const dailyRows = useMemo(() => {
    if (!data) return [];
    return data.dailyBreakdown ?? (data.trend ? data.trend.slice().reverse() : []);
  }, [data]);

  const handleExportAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.category) params.set("category", filters.category);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.tab) params.set("tab", filters.tab);
    params.set("page", "1");
    params.set("limit", "5000");

    const res = await fetch(`/api/admin/reports/sales?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to export full sales dataset");
    const json = await res.json();
    return (json.data?.dailyBreakdown ?? json.data?.trend?.slice().reverse() ?? []) as SalesTrendPoint[];
  }, [filters]);

  return (
    <PageContainer
      title="Sales Report"
      description="Comprehensive sales analytics, revenue trends, and daily order momentum."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Sales Report" },
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
              { name: "category", label: "Category", options: options?.categories ?? [] },
              { name: "brand", label: "Brand", options: options?.brands ?? [] },
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

            {/* KPI Cards styled after OrderStatsCards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricCard
                label="GROSS SALES"
                value={money(data.totals.grossSales)}
                hint="Before discounts & deductions"
                delta={data.changes.grossSales}
                compareLabel={compare}
                icon={IndianRupee}
                accentBorder="border-l-amber-600"
              />
              <MetricCard
                label="NET SALES"
                value={money(data.totals.netSales)}
                hint={`${count(data.totals.orders)} total completed orders`}
                delta={data.changes.netSales}
                compareLabel={compare}
                icon={IndianRupee}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="AVG ORDER VALUE (AOV)"
                value={money(data.totals.avgOrderValue)}
                hint="Per completed order"
                delta={data.changes.avgOrderValue}
                compareLabel={compare}
                icon={ShoppingCart}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="DISCOUNTS & OFFERS"
                value={money(data.totals.discount)}
                hint={`${count(data.totals.units)} snacks units sold`}
                delta={data.changes.discount}
                compareLabel={compare}
                icon={Tag}
                tone="warn"
                accentBorder="border-l-secondary-600"
              />
              <MetricCard
                label="TOTAL ORDERS"
                value={count(data.totals.orders)}
                hint="Excluding cancelled & returned"
                delta={data.changes.orders}
                compareLabel={compare}
                icon={ShoppingCart}
                accentBorder="border-l-amber-600"
              />
              <MetricCard
                label="UNITS SOLD"
                value={count(data.totals.units)}
                hint="Across all product lines"
                delta={data.changes.units}
                compareLabel={compare}
                icon={Package}
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="TAX COLLECTED"
                value={money(data.totals.tax)}
                hint="GST collected in period"
                delta={data.changes.tax}
                compareLabel={compare}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="DELIVERY CHARGED"
                value={money(data.totals.shipping)}
                hint="Courier & shipping fees"
                delta={data.changes.shipping}
                compareLabel={compare}
                icon={Truck}
                accentBorder="border-l-secondary-600"
              />
            </div>

            {/* Sales Momentum Trend */}
            <Panel
              title="Sales Momentum Trend"
              hint={`Daily net sales progression in this time window · Total in Period: ${money(data.totals.netSales)}`}
            >
              <TrendChart
                data={data.trend}
                bucket={data.range.bucket}
                format={(n) => money(n)}
                series={[
                  { key: "net", label: "Net sales", value: (r) => r.netSales, color: CHART_COLORS.primary },
                  { key: "gross", label: "Gross product value", value: (r) => r.grossSales, color: CHART_COLORS.teal },
                ]}
              />
            </Panel>

            {/* Daily Sales Breakdown Table with Segmented Tabs, Maroon Header & Excel Export */}
            <DataTable
              title="Daily Sales Breakdown"
              hint="Itemized view by calendar date"
              serverSide={true}
              rows={dailyRows}
              columns={dailyBreakdownColumns}
              rowKey={(r) => r.bucket}
              tabs={dailyTabs}
              activeTabKey={filters.tab || "all"}
              onTabChange={(tab) =>
                setFilters((prev) => ({ ...prev, tab: tab === "all" ? "" : tab, page: "1" }))
              }
              counterBadge={`${data.pagination?.total ?? dailyRows.length} day(s) recorded`}
              page={Number(filters.page || 1)}
              pageSize={Number(filters.limit || 10)}
              totalItems={data.pagination?.total ?? dailyRows.length}
              totalPages={data.pagination?.totalPages ?? 1}
              onPageChange={(p) =>
                setFilters((prev) => ({ ...prev, page: String(p) }))
              }
              onPageSizeChange={(s) =>
                setFilters((prev) => ({ ...prev, limit: String(s), page: "1" }))
              }
              onExportAll={handleExportAll}
              exportFileName="daily_sales_breakdown"
              empty="No daily sales recorded in this period."
              defaultPageSize={10}
              isLoading={isFetching}
            />

            {/* Detailed breakdowns */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataTable
                title="Sales by Category"
                hint="Product value share by department"
                counterBadge={`${data.byCategory.length} categories`}
                rows={data.byCategory}
                columns={breakdownColumns("Category")}
                rowKey={(r) => r.key}
                exportFileName="sales_by_category"
                empty="No category sales in this period."
                paginate={false}
              />

              <DataTable
                title="Sales by Brand"
                hint="Brand momentum in this window"
                counterBadge={`${data.byBrand.length} brands`}
                rows={data.byBrand}
                columns={breakdownColumns("Brand")}
                rowKey={(r) => r.key}
                exportFileName="sales_by_brand"
                empty="No brand sales in this period."
                paginate={false}
              />

              <DataTable
                title="Sales by Payment Method"
                hint="Customer payment preference breakdown"
                counterBadge={`${data.byPaymentMethod.length} methods`}
                rows={data.byPaymentMethod}
                columns={breakdownColumns("Payment Method", false)}
                rowKey={(r) => r.key}
                exportFileName="sales_by_payment_method"
                empty="No payments recorded in this period."
                paginate={false}
              />

              <DataTable
                title="Top Products"
                hint="Highest revenue generating snacks"
                counterBadge={`${data.topProducts.length} products`}
                rows={data.topProducts}
                columns={breakdownColumns("Product")}
                rowKey={(r) => r.key}
                exportFileName="top_products"
                empty="No products sold in this period."
                paginate={false}
              />

              <div className="lg:col-span-2">
                <DataTable
                  title="Top Customers"
                  hint="Highest purchasing customers in this period"
                  counterBadge={`${data.topCustomers.length} customers`}
                  rows={data.topCustomers}
                  columns={breakdownColumns("Customer", false)}
                  rowKey={(r) => r.key}
                  exportFileName="top_customers"
                  empty="No customers bought in this period."
                  paginate={false}
                />
              </div>
            </div>

            <Note>
              Cancelled and returned orders are completely excluded from net sales, unit counts, and order momentum calculations. For full pipeline insight, see the Orders Report.
            </Note>
          </>
        )}
      </div>
    </PageContainer>
  );
}
