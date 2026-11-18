"use client";

import React from "react";
import {
  ArrowLeft,
  Package,
  PackageX,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/admin/PageContainer";
import {
  type Column,
  DataTable,
  ExportButton,
  IdBadge,
  MetricCard,
  Panel,
  RangeCaption,
  ReportError,
  ReportFilters,
  ReportSkeleton,
  ShareBar,
  count,
  money,
  moneyExact,
  percent,
} from "@/features/reports/components/report-ui";
import { reportErrorMessage, useReport, useReportOptions } from "@/features/reports/hooks/use-report";
import type { GroupRow, ProductsReport, SkuRow } from "@/features/reports/services/products-report.service";

const skuColumns: Column<SkuRow>[] = [
  { header: "SKU", cell: (r) => <IdBadge>{r.sku}</IdBadge>, csv: (r) => r.sku },
  { header: "PRODUCT", cell: (r) => <span className="font-semibold text-stone-900">{r.product}</span>, csv: (r) => r.product },
  { header: "VARIANT", cell: (r) => <span className="text-stone-700">{r.variant}</span>, csv: (r) => r.variant },
  { header: "CATEGORY", cell: (r) => <span className="text-stone-600">{r.category}</span>, csv: (r) => r.category },
  { header: "BRAND", cell: (r) => <span className="text-stone-600">{r.brand}</span>, csv: (r) => r.brand },
  { header: "UNITS", align: "right", cell: (r) => count(r.units), csv: (r) => r.units },
  { header: "ORDERS", align: "right", cell: (r) => count(r.orders), csv: (r) => r.orders },
  { header: "REVENUE", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "RETURNED", align: "right", cell: (r) => count(r.returnedUnits), csv: (r) => r.returnedUnits },
  { header: "IN STOCK", align: "right", cell: (r) => <span className="font-semibold text-stone-800">{count(r.stock)}</span>, csv: (r) => r.stock },
];

const skuTabs = [
  { key: "all", label: "All SKUs" },
  { key: "top", label: "Top Sellers", filter: (r: SkuRow) => r.units >= 5 },
  { key: "low_stock", label: "Low Stock (≤15)", filter: (r: SkuRow) => r.stock <= 15 },
];

const groupColumns = (header: string): Column<GroupRow>[] => [
  { header, cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  { header: "SKUs", align: "right", cell: (r) => count(r.skus), csv: (r) => r.skus },
  { header: "Units", align: "right", cell: (r) => count(r.units), csv: (r) => r.units },
  { header: "Revenue", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "Share", align: "right", cell: (r) => <ShareBar share={r.share} />, csv: (r) => r.share },
];

const compactSkuColumns: Column<SkuRow>[] = [
  { header: "SKU", cell: (r) => <IdBadge>{r.sku}</IdBadge>, csv: (r) => r.sku },
  { header: "PRODUCT", cell: (r) => <span className="font-semibold text-stone-900">{r.product}</span>, csv: (r) => r.product },
  { header: "UNITS", align: "right", cell: (r) => count(r.units), csv: (r) => r.units },
  { header: "REVENUE", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.revenue)}</span>, csv: (r) => r.revenue },
  { header: "IN STOCK", align: "right", cell: (r) => count(r.stock), csv: (r) => r.stock },
];

export default function ProductsReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<ProductsReport>(
    "/api/admin/reports/products"
  );
  const { data: options } = useReportOptions();

  return (
    <PageContainer
      title="Products Report"
      description="What sold, what did not, and what each SKU actually earned."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Products Report" },
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
          {data?.skus && data.skus.length > 0 && (
            <ExportButton
              rows={data.skus}
              columns={skuColumns}
              fileName="products_performance"
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MetricCard
                label="SKUS SOLD"
                value={count(data.totals.skusSold)}
                hint="Distinct products with orders"
                icon={Package}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="UNITS ORDERED"
                value={count(data.totals.units)}
                hint="Total items purchased"
                icon={ShoppingBag}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="PRODUCT REVENUE"
                value={money(data.totals.revenue)}
                hint="Gross product value sold"
                icon={TrendingUp}
                tone="good"
                accentBorder="border-l-teal-600"
              />
              <MetricCard
                label="RETURN RATE"
                value={percent(data.totals.returnRate)}
                hint={`${count(data.totals.returnedUnits)} units returned`}
                icon={Undo2}
                tone={data.totals.returnRate > 5 ? "warn" : "default"}
                accentBorder="border-l-amber-600"
              />
            </div>

            {/* Complete SKU Performance Table with Segmented Tabs, Maroon Header & Excel Export */}
            <Panel
              title="SKU Performance"
              hint={
                data.skusTruncated
                  ? "SKUs sorted by revenue in this period (capped at 1,000)"
                  : "Every SKU that recorded an order in this window"
              }
            >
              <DataTable
                rows={data.skus}
                columns={skuColumns}
                rowKey={(r) => r.key}
                tabs={skuTabs}
                counterBadge={`${data.skus.length} SKUs`}
                searchPlaceholder="Search by SKU, product name, or variant..."
                exportFileName="sku_sales_performance"
                empty="No products sold in this period."
                defaultPageSize={20}
              />
            </Panel>

            {/* Best Sellers and Slow Movers */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Top 10 Best Sellers"
                hint="Products by unit velocity"
              >
                <DataTable
                  rows={data.bestSellers}
                  columns={compactSkuColumns}
                  rowKey={(r) => r.key}
                  exportFileName="top_best_sellers"
                  empty="No sales in this period."
                />
              </Panel>

              <Panel
                title="Slowest Moving SKUs"
                hint="Sold products with lowest unit volume"
              >
                <DataTable
                  rows={data.slowMovers}
                  columns={compactSkuColumns}
                  rowKey={(r) => r.key}
                  exportFileName="slow_moving_products"
                  empty="No slow movers found."
                />
              </Panel>
            </div>

            {/* Zero-sale SKUs */}
            {data.zeroSale.length > 0 && (
              <Panel
                title="Zero-Sale SKUs"
                hint={
                  data.zeroSaleTruncated
                    ? `Active products with zero sales in this window (${data.totals.zeroSaleSkus} total, showing first ${data.zeroSale.length})`
                    : `Active products with zero sales in this window (${data.totals.zeroSaleSkus} total)`
                }
              >
                <DataTable
                  rows={data.zeroSale}
                  columns={compactSkuColumns}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Search dead catalog items..."
                  exportFileName="zero_sale_skus"
                  empty="All active products had sales in this period."
                />
              </Panel>
            )}

            {/* Category and Brand Rollups */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Revenue by Category"
                hint="Category share of merchandise sales"
              >
                <DataTable
                  rows={data.byCategory}
                  columns={groupColumns("Category")}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Filter category..."
                  exportFileName="category_sales"
                  empty="No category sales."
                />
              </Panel>

              <Panel
                title="Revenue by Brand"
                hint="Brand distribution in this period"
              >
                <DataTable
                  rows={data.byBrand}
                  columns={groupColumns("Brand")}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Filter brand..."
                  exportFileName="brand_sales"
                  empty="No brand sales."
                />
              </Panel>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
