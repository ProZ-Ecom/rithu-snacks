"use client";

import React, { useCallback } from "react";
import {
  ArrowLeft,
  Package,
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

  const handleExportAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.category) params.set("category", filters.category);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.tab) params.set("tab", filters.tab);
    params.set("page", "1");
    params.set("limit", "5000");

    const res = await fetch(`/api/admin/reports/products?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to export full products dataset");
    const json = await res.json();
    return (json.data?.skus ?? []) as SkuRow[];
  }, [filters]);

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
            <DataTable
              title="SKU Performance"
              hint="Every SKU that recorded an order in this window"
              serverSide={true}
              rows={data.skus}
              columns={skuColumns}
              rowKey={(r) => r.key}
              tabs={skuTabs}
              activeTabKey={filters.tab || "all"}
              onTabChange={(tab) =>
                setFilters((prev) => ({ ...prev, tab: tab === "all" ? "" : tab, page: "1" }))
              }
              counterBadge={`${data.pagination?.total ?? data.skus.length} SKUs`}
              page={Number(filters.page || 1)}
              pageSize={Number(filters.limit || 10)}
              totalItems={data.pagination?.total ?? data.skus.length}
              totalPages={data.pagination?.totalPages ?? 1}
              onPageChange={(p) =>
                setFilters((prev) => ({ ...prev, page: String(p) }))
              }
              onPageSizeChange={(s) =>
                setFilters((prev) => ({ ...prev, limit: String(s), page: "1" }))
              }
              onExportAll={handleExportAll}
              exportFileName="sku_sales_performance"
              empty="No products sold in this period."
              defaultPageSize={10}
              isLoading={isFetching}
            />

            {/* Best Sellers and Slow Movers */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataTable
                title="Top 10 Best Sellers"
                hint="Products by unit velocity"
                counterBadge={`${data.bestSellers.length} SKUs`}
                rows={data.bestSellers}
                columns={compactSkuColumns}
                rowKey={(r) => r.key}
                exportFileName="top_best_sellers"
                empty="No sales in this period."
                paginate={false}
              />

              <DataTable
                title="Slowest Moving SKUs"
                hint="Sold products with lowest unit volume"
                counterBadge={`${data.slowMovers.length} SKUs`}
                rows={data.slowMovers}
                columns={compactSkuColumns}
                rowKey={(r) => r.key}
                exportFileName="slow_moving_products"
                empty="No slow movers found."
                paginate={false}
              />
            </div>

            {/* Zero-sale SKUs */}
            {data.zeroSale.length > 0 && (
              <DataTable
                title="Zero-Sale SKUs"
                hint={
                  data.zeroSaleTruncated
                    ? `Active products with zero sales in this window (${data.totals.zeroSaleSkus} total, showing first ${data.zeroSale.length})`
                    : `Active products with zero sales in this window (${data.totals.zeroSaleSkus} total)`
                }
                counterBadge={`${data.zeroSale.length} SKUs`}
                rows={data.zeroSale}
                columns={compactSkuColumns}
                rowKey={(r) => r.key}
                exportFileName="zero_sale_skus"
                empty="All active products had sales in this period."
                paginate={true}
                defaultPageSize={10}
              />
            )}

            {/* Category and Brand Rollups */}
            <div className="grid gap-5 lg:grid-cols-2">
              <DataTable
                title="Revenue by Category"
                hint="Category share of merchandise sales"
                counterBadge={`${data.byCategory.length} categories`}
                rows={data.byCategory}
                columns={groupColumns("Category")}
                rowKey={(r) => r.key}
                exportFileName="category_sales"
                empty="No category sales."
                paginate={false}
              />

              <DataTable
                title="Revenue by Brand"
                hint="Brand distribution in this period"
                counterBadge={`${data.byBrand.length} brands`}
                rows={data.byBrand}
                columns={groupColumns("Brand")}
                rowKey={(r) => r.key}
                exportFileName="brand_sales"
                empty="No brand sales."
                paginate={false}
              />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
