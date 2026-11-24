"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { ReportPeriod } from "../types";
import { cn } from "@/lib/utils";
import { formatDateRange } from "./report-ui";

interface ReportFilterBarProps {
  period: ReportPeriod;
  onPeriodChange: (p: ReportPeriod) => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (d: string) => void;
  onEndDateChange?: (d: string) => void;
  dateRangeLabel?: string;
  children?: React.ReactNode;
}

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "this_year" },
  { label: "Custom", value: "custom" },
];

export function ReportFilterBar({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  dateRangeLabel,
  children,
}: ReportFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Period Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => {
            const isSelected = period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPeriodChange(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Date Window Label */}
        {(dateRangeLabel || (startDate && endDate)) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">
              {dateRangeLabel || formatDateRange(startDate, endDate)}
            </span>
          </div>
        )}
      </div>

      {/* Custom Date Inputs if Custom selected or extra filters */}
      {(period === "custom" || children) && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
          {period === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">From:</span>
              <input
                type="date"
                value={startDate || ""}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                className="h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground font-medium">To:</span>
              <input
                type="date"
                value={endDate || ""}
                onChange={(e) => onEndDateChange?.(e.target.value)}
                className="h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {children}
        </div>
      )}
    </div>
  );
}
