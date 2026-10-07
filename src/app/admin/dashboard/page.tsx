"use client";

import * as React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminPageHeader, AdminContent } from "@/components/admin/AdminPageHeader";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardData } from "@/features/dashboard/hooks";
import type { TimePeriod, ViewState } from "@/features/dashboard/types";
import {
  DashboardHeader,
  DashboardKpiCards,
  SalesRevenueOverview,
  OrderPipelineFunnel,
  TopSellingProductsSection,
  RecentDispatchOrdersSection,
  RestockAlertsSection,
  AdminShortcutsBar,
  DashboardSkeleton,
} from "@/components/admin/dashboard";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<TimePeriod>("this_month");
  const [viewState, setViewState] = useState<ViewState>("live");

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDashboardData(period);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    if (viewState !== "live") setViewState("live");
  };

  const currentMonthName = new Date().toLocaleString("en-IN", { month: "long" });
  const lastMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleString("en-IN", { month: "long" });
  const currentYear = new Date().getFullYear();

  const periodLabels: Record<TimePeriod, string> = {
    today: "Today",
    this_week: "This Week",
    this_month: `${currentMonthName} (This Month)`,
    last_month: `${lastMonthName} (Last Month)`,
    this_year: `${currentYear} (This Year)`,
    custom: "Custom Range",
  };

  // Explicit ViewState overrides or real loading/error states
  if (viewState === "skeleton" || (isLoading && viewState === "live")) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Store Dashboard"
          description="Overview of your store performance, orders, inventory & sales analytics"
          breadcrumbs={<AdminBreadcrumb items={[{ label: "Dashboard" }]} />}
        />
        <DashboardHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          viewState={viewState}
          onViewStateChange={setViewState}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  if (viewState === "error" || (error && viewState === "live")) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Store Dashboard"
          description="Overview of your store performance, orders, inventory & sales analytics"
          breadcrumbs={<AdminBreadcrumb items={[{ label: "Dashboard" }]} />}
        />
        <DashboardHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          viewState={viewState}
          onViewStateChange={setViewState}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
        <div className="py-12">
          <ErrorState
            title="Failed to Load Store Dashboard"
            message="Could not retrieve real-time metrics and order sync from the database."
            onRetry={() => {
              setViewState("live");
              refetch();
            }}
          />
        </div>
      </div>
    );
  }

  if (viewState === "empty" || !dashboardData) {
    return (
      <div className="flex-1 min-h-0 min-w-0 flex flex-col space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Store Dashboard"
          description="Overview of your store performance, orders, inventory & sales analytics"
          breadcrumbs={<AdminBreadcrumb items={[{ label: "Dashboard" }]} />}
        />
        <DashboardHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          viewState={viewState}
          onViewStateChange={setViewState}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
        <div className="py-12">
          <EmptyState
            title="No Store Activity Recorded"
            description="There are currently no orders, transactions, or harvest records for this timeframe."
          >
            <button
              type="button"
              onClick={() => setViewState("live")}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--secondary-base,#7a2224)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--secondary-shade-200,#4a140d)] transition-all cursor-pointer"
            >
              Switch to Live Data
            </button>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col space-y-5 sm:space-y-6 pb-8">
      {/* Top Header & Range Controls */}
      <DashboardHeader
        period={period}
        onPeriodChange={handlePeriodChange}
        viewState={viewState}
        onViewStateChange={setViewState}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* 8 Primary KPI Metric Cards (2 rows of 4) */}
      <DashboardKpiCards stats={dashboardData.stats} />

      {/* Sales & Revenue Overview with Custom SVG Interactive Spline Chart */}
      <SalesRevenueOverview
        data={dashboardData.chartData}
        overview={dashboardData.overview}
        periodLabel={periodLabels[period]}
      />

      {/* Two Columns Row: Order Pipeline & Top Selling Produce */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Order Pipeline Funnel */}
        <OrderPipelineFunnel
          pipeline={dashboardData.pipeline}
          totalOrdersCount={dashboardData.stats.totalOrders}
          successRate={dashboardData.pipelineHealth.successRate}
          hubSla={dashboardData.pipelineHealth.hubSla}
        />

        {/* Right Column: Top Selling Products */}
        <TopSellingProductsSection products={dashboardData.topProducts} />
      </div>

      {/* Recent Dispatch Orders Table */}
      <RecentDispatchOrdersSection
        orders={dashboardData.recentOrders}
        totalOrdersCount={dashboardData.stats.totalOrders}
      />

      {/* Restock & Procurement Alerts (Low Stock Warning Cards) */}
      {/* <RestockAlertsSection alerts={dashboardData.restockAlerts} /> */}

      {/* Store Administration Shortcuts Toolbar */}
      {/* <AdminShortcutsBar /> */}
    </div>
  );
}
