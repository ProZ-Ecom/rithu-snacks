"use client";

import React from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  PackageX,
  RefreshCw,
  Warehouse,
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
  Note,
  Panel,
  RangeCaption,
  ReportError,
  ReportFilters,
  ReportSkeleton,
  StatusBadge,
  count,
  dateLabel,
  formatCsvDateTime,
  money,
  moneyExact,
} from "@/features/reports/components/report-ui";
import { reportErrorMessage, useReport, useReportOptions } from "@/features/reports/hooks/use-report";
import type {
  InventoryReport,
  LedgerRow,
  MovementRow,
  StockRow,
} from "@/features/reports/services/inventory-report.service";

function StatusPill({ status }: { status: StockRow["status"] }) {
  if (status === "out") return <StatusBadge status="cancelled" />;
  if (status === "low") return <StatusBadge status="pending" />;
  return <StatusBadge status="delivered" />;
}

const stockColumns: Column<StockRow>[] = [
  { header: "SKU", cell: (r) => <IdBadge>{r.sku}</IdBadge>, csv: (r) => r.sku },
  { header: "PRODUCT", cell: (r) => <span className="font-semibold text-stone-900">{r.product}</span>, csv: (r) => r.product },
  { header: "CATEGORY", cell: (r) => <span className="text-stone-600">{r.category}</span>, csv: (r) => r.category },
  { header: "BRAND", cell: (r) => <span className="text-stone-600">{r.brand}</span>, csv: (r) => r.brand },
  { header: "STATUS", cell: (r) => <StatusPill status={r.status} />, csv: (r) => r.status },
  { header: "ON HAND", align: "right", cell: (r) => count(r.onHand), csv: (r) => r.onHand },
  { header: "RESERVED", align: "right", cell: (r) => count(r.reserved), csv: (r) => r.reserved },
  { header: "SELLABLE", align: "right", cell: (r) => <span className="font-bold text-stone-900">{count(r.sellable)}</span>, csv: (r) => r.sellable },
  { header: "REORDER AT", align: "right", cell: (r) => count(r.reorderLevel), csv: (r) => r.reorderLevel },
  { header: "VALUATION", align: "right", cell: (r) => <span className="font-bold text-stone-900">{moneyExact(r.valueAtPrice)}</span>, csv: (r) => r.valueAtPrice },
  { header: "SOLD IN PERIOD", align: "right", cell: (r) => count(r.soldInRange), csv: (r) => r.soldInRange },
  { header: "LAST MOVEMENT", cell: (r) => dateLabel(r.lastMovementAt), csv: (r) => formatCsvDateTime(r.lastMovementAt) },
];

const stockTabs = [
  { key: "all", label: "All Items" },
  { key: "in_stock", label: "In Stock", filter: (r: StockRow) => r.status === "ok" },
  { key: "low_stock", label: "Low Stock", filter: (r: StockRow) => r.status === "low" },
  { key: "out_of_stock", label: "Out of Stock", filter: (r: StockRow) => r.status === "out" },
];

const movementColumns: Column<MovementRow>[] = [
  { header: "Movement Type", cell: (r) => <span className="font-semibold text-stone-900">{r.label}</span>, csv: (r) => r.label },
  {
    header: "Direction",
    cell: (r) => (
      <span className={r.direction === "in" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
        {r.direction === "in" ? "Stock In (+)" : "Stock Out (−)"}
      </span>
    ),
    csv: (r) => r.direction,
  },
  { header: "Entries", align: "right", cell: (r) => count(r.entries), csv: (r) => r.entries },
  { header: "Units", align: "right", cell: (r) => <span className="font-bold text-stone-900">{count(r.units)}</span>, csv: (r) => r.units },
];

const ledgerColumns: Column<LedgerRow>[] = [
  { header: "Logged At", cell: (r) => dateLabel(r.at), csv: (r) => formatCsvDateTime(r.at) },
  { header: "SKU", cell: (r) => <IdBadge>{r.sku}</IdBadge>, csv: (r) => r.sku },
  { header: "Movement", cell: (r) => <span className="font-medium text-stone-800">{r.movementType ?? r.type}</span>, csv: (r) => r.movementType ?? r.type },
  {
    header: "Quantity",
    align: "right",
    cell: (r) => (
      <span className={`font-semibold ${r.quantity > 0 ? "text-emerald-700" : "text-rose-700"}`}>
        {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
      </span>
    ),
    csv: (r) => r.quantity,
  },
  { header: "Reference", cell: (r) => <span className="text-stone-600 font-mono text-xs">{r.reference ?? "—"}</span>, csv: (r) => r.reference },
  { header: "Note", cell: (r) => <span className="text-stone-500 text-xs">{r.note ?? "—"}</span>, csv: (r) => r.note },
];

export default function InventoryReportPage() {
  const { filters, setFilters, data, isLoading, isFetching, error, refetch } = useReport<InventoryReport>(
    "/api/admin/reports/inventory"
  );
  const { data: options } = useReportOptions();

  return (
    <PageContainer
      title="Inventory Report"
      description="Stock levels, valuation at retail price, reorder alerts, and complete ledger."
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reports", href: "/admin/dashboard/reports" },
        { label: "Inventory Report" },
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
          {data?.rows && data.rows.length > 0 && (
            <ExportButton
              rows={data.rows}
              columns={stockColumns}
              fileName="inventory_stock_valuation"
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
                label="TOTAL SKUS"
                value={count(data.totals.skus)}
                hint="Active inventory items"
                icon={Warehouse}
                accentBorder="border-l-primary-500"
              />
              <MetricCard
                label="UNITS ON HAND"
                value={count(data.totals.unitsOnHand)}
                hint={`${count(data.totals.unitsSellable)} sellable, ${count(data.totals.unitsReserved)} reserved`}
                tone="good"
                accentBorder="border-l-emerald-600"
              />
              <MetricCard
                label="STOCK VALUATION"
                value={money(data.totals.valueAtPrice)}
                hint="At standard retail base price"
                tone="good"
                accentBorder="border-l-teal-600"
              />
              <MetricCard
                label="ATTENTION NEEDED"
                value={count(data.totals.lowStock + data.totals.outOfStock)}
                hint={`${count(data.totals.outOfStock)} out of stock, ${count(data.totals.lowStock)} low stock`}
                icon={AlertTriangle}
                tone={data.totals.lowStock + data.totals.outOfStock > 0 ? "warn" : "default"}
                accentBorder="border-l-rose-600"
              />
            </div>

            {/* Complete Stock Table with Segmented Tabs, Maroon Header & Excel Export */}
            <Panel
              title="Stock Levels & Valuation"
              hint={
                data.rowsTruncated
                  ? "SKUs sorted by valuation (capped at 1,000)"
                  : "All active inventory SKUs"
              }
            >
              <DataTable
                rows={data.rows}
                columns={stockColumns}
                rowKey={(r) => r.key}
                tabs={stockTabs}
                counterBadge={`${data.rows.length} SKUs`}
                searchPlaceholder="Search by SKU, product name, or brand..."
                exportFileName="stock_valuation"
                empty="No inventory items found."
                defaultPageSize={20}
              />
            </Panel>

            {/* Movement Summary & Recent Ledger */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Stock Movement Summary"
                hint="Inflow and outflow by transaction category"
              >
                <DataTable
                  rows={data.movements}
                  columns={movementColumns}
                  rowKey={(r) => r.key}
                  searchPlaceholder="Filter movement..."
                  exportFileName="stock_movements"
                  empty="No stock movements recorded in this period."
                />
              </Panel>

              <Panel
                title="Stock Ledger Audit"
                hint="Recent inventory transactions and balance adjustments"
              >
                <DataTable
                  rows={data.ledger}
                  columns={ledgerColumns}
                  rowKey={(r) => r.id}
                  searchPlaceholder="Filter by SKU or type..."
                  exportFileName="inventory_ledger"
                  empty="No transactions in this period."
                  defaultPageSize={10}
                />
              </Panel>
            </div>

            <Note>
              Valuation reflects current inventory on hand multiplied by each SKU&apos;s active base price. Sellable quantity subtracts reserved stock held in active customer carts and orders pending dispatch.
            </Note>
          </>
        )}
      </div>
    </PageContainer>
  );
}
