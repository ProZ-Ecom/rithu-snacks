"use client";

import React, { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface TrendDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface ReportTrendChartProps {
  title: string;
  subtitle?: string;
  data: TrendDataPoint[];
  valuePrefix?: string;
  isCurrency?: boolean;
}

export function ReportTrendChart({
  title,
  subtitle,
  data,
  isCurrency = true,
}: ReportTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center text-xs text-muted-foreground">
        No trend data available for this date window.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Total in Period: </span>
          <span className="text-sm font-bold text-foreground">
            {isCurrency ? formatPrice(totalValue) : totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex h-44 items-end gap-1.5 pt-4 pb-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max(Math.round((item.value / maxValue) * 100), 4);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative flex flex-1 flex-col items-center h-full justify-end"
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-10 z-20 flex flex-col items-center bg-popover text-popover-foreground border border-border text-[11px] px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap">
                  <span className="font-semibold">
                    {isCurrency ? formatPrice(item.value) : item.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              )}

              {/* Bar */}
              <div className="w-full flex items-end justify-center h-32">
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 ${
                    isHovered
                      ? "bg-primary"
                      : "bg-primary/80 group-hover:bg-primary"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* Label */}
              <span className="mt-2 text-[10px] font-medium text-muted-foreground truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
