"use client";

import * as React from "react";
import {
  Package,
  Layers,
  Users,
  ShoppingBag,
  IndianRupee,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { DashboardStats } from "@/features/dashboard/types";
import { useRazorpaySettlements } from "@/features/payment/hooks/use-razorpay-settlements";
import { cn } from "@/lib/utils";

interface DashboardKpiCardsProps {
  stats: DashboardStats;
}

export function DashboardKpiCards({ stats }: DashboardKpiCardsProps) {
  const { data: settlementData, isLoading: isSettlementsLoading } = useRazorpaySettlements(90);

  const settlementSummary = settlementData?.settlementSummary;
  const totalSettled = settlementSummary?.totalSettled ?? 0;
  const netReceived = settlementSummary?.netReceived ?? 0;
  const settlementCount = settlementSummary?.settlementCount ?? 0;
  const pendingSettlement = settlementData?.paymentSummary?.pendingSettlement ?? 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. TOTAL PRODUCTS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Total Products
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
            <Package className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.totalProducts}
            </span>
            <span className="text-sm font-semibold text-stone-500">Items</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{stats.productsBadgeText || "Traditional varieties active"}</span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORIES */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Categories
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/15">
            <Layers className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.totalCategories}
            </span>
            <span className="text-sm font-semibold text-stone-500">Clusters</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            <span className="truncate">{stats.categoriesBadgeText || "Store categories active"}</span>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE CUSTOMERS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Active Customers
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-500/15">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.totalCustomers.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>
              {stats.customerGrowthPercent !== undefined
                ? `${stats.customerGrowthPercent >= 0 ? "+" : ""}${stats.customerGrowthPercent}% vs prev period`
                : "Active customer base"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. TOTAL ORDERS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Total Orders
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-500/15">
            <ShoppingBag className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.totalOrders.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
            <span className="font-bold text-emerald-600">{stats.fulfillmentRatePercent ?? 100}%</span>
            <span>fulfillment rate</span>
          </div>
        </div>
      </div>

      {/* 5. PAYMENT SETTLEMENTS (Replaces Gross Revenue) */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Payment Settlements
            </span>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
              Live API
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
            <Landmark className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {isSettlementsLoading && !settlementData ? (
                <span className="inline-block h-8 w-28 animate-pulse rounded bg-stone-100" />
              ) : (
                formatPrice(totalSettled)
              )}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            {isSettlementsLoading && !settlementData ? (
              <span className="text-stone-400 font-normal">Fetching settlement data...</span>
            ) : settlementCount > 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="truncate text-stone-600 font-medium">
                  Net: <span className="font-bold text-emerald-700">{formatPrice(netReceived)}</span> ({settlementCount} batch{settlementCount === 1 ? "" : "es"})
                </span>
              </>
            ) : (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span className="truncate text-stone-500 font-medium">
                  {pendingSettlement > 0
                    ? `Pending: ${formatPrice(pendingSettlement)}`
                    : "No settlements pending"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 6. PENDING ORDERS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Pending Orders
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/15">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.pendingOrders}
            </span>
            <span className="text-sm font-semibold text-stone-500">Orders</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="truncate">{stats.pendingOrdersNotice || "All orders processed"}</span>
          </div>
        </div>
      </div>

      {/* 7. STOCK WARNINGS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Stock Warnings
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-500/15">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.stockWarnings}
            </span>
            <span className="text-sm font-semibold text-stone-500">Products</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="truncate">{stats.stockWarningsNotice || "Inventory levels optimal"}</span>
          </div>
        </div>
      </div>

      {/* 8. TODAY'S ORDERS */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Today's Orders
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
            <Zap className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              {stats.todayOrders}
            </span>
            <span className="text-sm font-semibold text-stone-500">Orders</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
            <span className="text-emerald-700 font-bold">{formatPrice(stats.todayRevenue)}</span>
            <span className="text-stone-500 font-normal">
              {stats.todayAvgComparison !== undefined
                ? `(${stats.todayAvgComparison >= 0 ? "+" : ""}${stats.todayAvgComparison}% vs daily avg)`
                : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
