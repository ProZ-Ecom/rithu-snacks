"use client";

import React from "react";
import {
  ArrowLeft,
  MapPin,
  RefreshCw,
  Repeat,
  UserPlus,
  Users,
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
import type {
  AcquisitionRow,
  CustomersReport,
  GeoRow,
  TopCustomerRow,
} from "@/features/reports/services/customers-report.service";

const customerColumns: Column<TopCustomerRow>[] = [
  { header: "CUSTOMER", cell: (r) => <span className="font-semibold text-stone-900">{r.name}</span>, csv: (r) => r.name },
  {
    header: "CUSTOMER ID",
    cell: (r) => (r.custId ? <IdBadge>{r.custId}</IdBadge> : <span className="text-stone-400">—</span>),
    csv: (r) => r.custId,
  },
  { header: "PHONE", cell: (r) => <span className="font-mono text-xs text-stone-600">{r.phone ?? "—"}</span>, csv: (r) => r.phone },
  { header: "CITY", cell: (r) => <span className="text-stone-700">{r.city ?? "—"}</span>, csv: (r) => r.city },
  { header: "ORDERS", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "TOTAL SPENT", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "AVG ORDER", align: "right", cell: (r) => moneyExact(r.avgOrderValue), csv: (r) => r.avgOrderValue },
  { header: "LAST ORDER", cell: (r) => dateLabel(r.lastOrderAt), csv: (r) => formatCsvDateTime(r.lastOrderAt) },
  {
    header: "SINCE LAST ORDER",
    align: "right",
    cell: (r) => (
      <span className="text-xs text-stone-600">
        {r.daysSinceLastOrder == null ? "—" : r.daysSinceLastOrder === 0 ? "Today" : days(r.daysSinceLastOrder)}
      </span>
    ),
    csv: (r) => r.daysSinceLastOrder,
  },
];

const customerTabs = [
  { key: "all", label: "All Customers" },
  { key: "repeat", label: "Repeat Buyers (2+)", filter: (r: TopCustomerRow) => r.orders >= 2 },
  { key: "high_spend", label: "High Spend (>₹1,000)", filter: (r: TopCustomerRow) => r.revenue >= 1000 },
];

const geoColumns = (header: string): Column<GeoRow>[] => [
  { header, cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "Customers", align: "right", cell: (r) => count(r.customers), csv: (r) => r.customers },
  { header: "Orders", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "Revenue", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "Share", align: "right", cell: (r) => <ShareBar share={r.share} />, csv: (r) => r.share },
];

const acquisitionColumns: Column<AcquisitionRow>[] = [
  { header: "Order Cohort", cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "Customers", align: "right", cell: (r) => count(r.customers), csv: (r) => r.customers },
  { header: "Orders", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "Revenue", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "Share", align: "right", cell: (r) => <ShareBar share={r.share} />, csv: (r) => r.share },
];

export default function CustomersReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<CustomersReport>(
    "/api/admin/reports/customers"
  );

  const compare = data ? compareLabelFor(data.range.days) : undefined;

  return (
    <PageContainer
      title="Customers Report"
      description="Who bought, who came back, where they are, and who has gone quiet."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Customers Report" },
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
          {data?.topCustomers && data.topCustomers.length > 0 && (
            <ExportButton
              rows={data.topCustomers}
              columns={customerColumns}
              fileName="top_customers"
              label="Export Excel"
            />
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Panel>
          <ReportFilters value={filters} onChange={setFilters} />
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
                label="NEW SIGNUPS"
                value={count(data.totals.signups)}
                hint="Accounts created in window"
                delta={data.changes.signups}
                compareLabel={compare}
                icon={UserPlus}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="ACTIVE BUYERS"
                value={count(data.totals.buyers)}
                hint={`${count(data.totals.newBuyers)} new, ${count(data.totals.returningBuyers)} repeat`}
                delta={data.changes.buyers}
                compareLabel={compare}
                icon={Users}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="REPEAT BUYER RATE"
                value={percent(data.totals.repeatRate)}
                hint="Of all buyers in this window"
                delta={data.changes.repeatRate}
                compareLabel={compare}
                icon={Repeat}
                tone="good"
                accentBorder="border-l-teal-600"
              />
              <MetricCard
                label="REVENUE PER BUYER"
                value={money(data.totals.revenuePerBuyer)}
                hint={`${data.totals.avgOrdersPerBuyer} avg orders per buyer`}
                delta={data.changes.revenuePerBuyer}
                compareLabel={compare}
                accentBorder="border-l-amber-600"
              />
            </div>

            {/* Customer Trend (matches Dashboard Spline Graph) */}
            <Panel
              title="Customer Growth & Retention"
              hint={`Signups vs buyers over time · Total Buyers: ${count(data.totals.buyers)}`}
            >
              <TrendChart
                data={data.trend}
                bucket={data.range.bucket}
                format={(n) => `${n} users`}
                series={[
                  { key: "signups", label: "Signups", value: (r) => r.signups, color: CHART_COLORS.amber },
                  { key: "new", label: "First-time buyers", value: (r) => r.newBuyers, color: CHART_COLORS.teal },
                  { key: "repeat", label: "Returning buyers", value: (r) => r.returningBuyers, color: CHART_COLORS.primary },
                ]}
              />
            </Panel>

            {/* Top Customers Table with Segmented Tabs, Maroon Header & Excel Export */}
            <Panel
              title="Top Customers by Spend"
              hint="Highest spending customers in this period"
            >
              <DataTable
                rows={data.topCustomers}
                columns={customerColumns}
                rowKey={(r) => r.id}
                tabs={customerTabs}
                counterBadge={`${data.topCustomers.length} buyers`}
                searchPlaceholder="Search customer name, ID, or city..."
                exportFileName="top_customers"
                empty="No customer orders in this period."
                defaultPageSize={20}
              />
            </Panel>

            {/* Churn Risk */}
            {data.churnRisk.length > 0 && (
              <Panel
                title="Customers at Risk of Churn"
                hint="Customers with strong historical spend who haven't ordered in 90+ days"
              >
                <DataTable
                  rows={data.churnRisk}
                  columns={customerColumns}
                  rowKey={(r) => r.id}
                  searchPlaceholder="Search quiet customers..."
                  exportFileName="churn_risk_customers"
                  empty="No customers at risk."
                />
              </Panel>
            )}

            {/* Geography & Cohort Analysis */}
            <div className="grid gap-5 lg:grid-cols-3">
              <Panel
                title="Top States"
                hint="Regional sales distribution"
              >
                <DataTable
                  rows={data.byState}
                  columns={geoColumns("State")}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Filter state..."
                  exportFileName="customers_by_state"
                  empty="No state data."
                />
              </Panel>

              <Panel
                title="Top Cities"
                hint="City-wise demand breakdown"
              >
                <DataTable
                  rows={data.byCity}
                  columns={geoColumns("City")}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Filter city..."
                  exportFileName="customers_by_city"
                  empty="No city data."
                />
              </Panel>

              <Panel
                title="Order Frequency Cohorts"
                hint="First-time vs repeat cohort spread"
              >
                <DataTable
                  rows={data.acquisition}
                  columns={acquisitionColumns}
                  rowKey={(r) => r.key}
                  exportFileName="customer_cohorts"
                  empty="No cohort data."
                />
              </Panel>
            </div>

            <Note>
              A buyer is counted as &ldquo;new&rdquo; only if their very first completed order occurred in this window. A customer with previous order history ordering again in this period is counted as a &ldquo;returning buyer&rdquo;.
            </Note>
          </>
        )}
      </div>
    </PageContainer>
  );
}
