"use client";

import * as React from "react";
import { RefreshCw, Radio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimePeriod, ViewState } from "@/features/dashboard/types";

interface DashboardHeaderProps {
  period: TimePeriod;
  onPeriodChange: (p: TimePeriod) => void;
  viewState: ViewState;
  onViewStateChange: (v: ViewState) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const PERIOD_OPTIONS: { id: TimePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

const VIEW_STATE_OPTIONS: { id: ViewState; label: string }[] = [
  { id: "live", label: "Live Data" },
  { id: "skeleton", label: "Skeleton" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
];

export function DashboardHeader({
  period,
  onPeriodChange,
  viewState,
  onViewStateChange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & Hub info */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-neutral-900,#1c1917)]">
            Store Dashboard
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Live Store Sync
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[var(--color-neutral-500,#7c7169)]">
          Overview of your store performance &bull; Rithu Snacks Operations Hub
        </p>
      </div>

      {/* Action Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        {/* View State Controls (Live, Skeleton, Empty, Error) */}
        {/* <div className="hidden xl:flex items-center rounded-xl bg-stone-100/80 p-1 border border-stone-200/80">
          {VIEW_STATE_OPTIONS.map((item) => {
            const isActive = viewState === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewStateChange(item.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                  isActive
                    ? "bg-white text-stone-900 shadow-xs font-semibold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div> */}

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-stone-100/90 p-1 border border-stone-200/80 shadow-2xs">
          {PERIOD_OPTIONS.map((item) => {
            const isActive = period === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPeriodChange(item.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all select-none cursor-pointer",
                  isActive
                    ? "bg-[var(--secondary-base,#7a2224)] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Manual Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="inline-flex items-center justify-center h-8.5 w-8.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-[var(--secondary-base,#7a2224)]")} />
        </button>
      </div>
    </div>
  );
}
