"use client";

import * as React from "react";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { ChartDataPoint, OverviewMetrics } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";
import { TrendingUp, ShieldCheck, ArrowDownRight, AlertCircle } from "lucide-react";

interface SalesRevenueOverviewProps {
  data: ChartDataPoint[];
  overview: OverviewMetrics;
  periodLabel?: string;
}

export function SalesRevenueOverview({
  data,
  overview,
  periodLabel = "Current Cycle",
}: SalesRevenueOverviewProps) {
  const [viewMode, setViewMode] = useState<"revenue" | "volume">("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback if data is empty
  const safeData =
    data && data.length > 0
      ? data
      : [
          { date: "Day 1", label: "Day 1", revenue: 0, orders: 0 },
          { date: "Today", label: "Today", revenue: 0, orders: 0 },
        ];

  // Find peak index by default if none hovered
  const peakIndex = safeData.findIndex((d) => d.isPeak);
  const activeIndex =
    hoveredIndex !== null
      ? hoveredIndex
      : peakIndex !== -1
      ? peakIndex
      : safeData.length - 1;

  // SVG dimensions with generous top headroom
  const width = 1000;
  const height = 320;
  const paddingX = 55;
  const paddingTop = 60;
  const paddingBottom = 45;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Values calculation with 35% safety headroom so peaks never touch the top boundary
  const values = safeData.map((d) => (viewMode === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...values, 1);
  const maxVal = rawMax * 1.35;
  const minVal = 0;

  // Coordinates calculation
  const points = safeData.map((d, i) => {
    const val = viewMode === "revenue" ? d.revenue : d.orders;
    const x = paddingX + (i / (safeData.length - 1 || 1)) * chartWidth;
    const y = height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, data: d, val, index: i };
  });

  // Calculate Segment Paths & Directional Color (Green when upward, Red when downward)
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    const path = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    const areaPath = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} L ${p2.x},${height - paddingBottom} L ${p1.x},${height - paddingBottom} Z`;

    const isUp = p2.val >= p1.val;

    segments.push({
      index: i,
      path,
      areaPath,
      isUp,
      startPoint: p1,
      endPoint: p2,
    });
  }

  // Determine active point trend relative to previous
  const activePt = points[activeIndex] || points[0];
  const prevVal = activeIndex > 0 ? points[activeIndex - 1].val : activePt.val;
  const currVal = activePt.val ?? 0;
  const isActiveUp = currVal >= prevVal;
  const activeDiff = currVal - prevVal;
  const activePercent =
    prevVal > 0 ? Math.round((Math.abs(activeDiff) / prevVal) * 100) : activeDiff > 0 ? 100 : 0;

  // Grid levels (20%, 50%, 80%)
  const gridLevels = [0.8, 0.5, 0.2];

  // Tooltip dynamic positioning & boundary clipping prevention
  const topPct = (activePt.y / height) * 100;
  const leftPct = (activePt.x / width) * 100;

  // Place tooltip below the point if it's near the top (topPct < 32%)
  const placeBelow = topPct < 32;

  let translateX = "-50%";
  if (activeIndex === 0) translateX = "0%";
  else if (activeIndex === safeData.length - 1) translateX = "-100%";

  const translateY = placeBelow ? "16px" : "calc(-100% - 14px)";

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs overflow-visible">
      {/* Top Header & Toggle & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Sales &amp; Revenue Overview
            </h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              {periodLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            Real-time organic snacks demand and revenue trajectory
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap self-start lg:self-auto">
          {/* Visual Margin / Trend Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/70">
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
              Upward Growth
            </span>
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              Downward Margin
            </span>
          </div>

          {/* View Toggle */}
          <div className="inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80">
            <button
              type="button"
              onClick={() => setViewMode("revenue")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "revenue"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              )}
            >
              Revenue (₹)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("volume")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                viewMode === "volume"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              )}
            >
              Order Volume
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Metrics Row */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
        {/* Average Order Value */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-stone-500">Average Order Value</span>
          <span className="mt-0.5 text-lg sm:text-xl font-bold text-stone-900">
            {formatPrice(overview.averageOrderValue)}
          </span>
          <span
            className={cn(
              "mt-1 flex items-center text-xs font-semibold",
              overview.aovTrend === "down" ? "text-rose-600" : "text-emerald-600"
            )}
          >
            {overview.aovTrend === "down" ? (
              <ArrowDownRight className="mr-1 h-3.5 w-3.5" />
            ) : (
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
            )}
            {overview.aovComparisonText}
          </span>
        </div>

        {/* Gross Margin */}
        <div className="flex flex-col border-stone-100 sm:border-l sm:pl-4">
          <span className="text-xs font-medium text-stone-500">Gross Margin</span>
          <span className="mt-0.5 text-lg sm:text-xl font-bold text-stone-900">
            {overview.grossMarginPercent}%
          </span>
          <span
            className={cn(
              "mt-1 flex items-center text-xs font-semibold",
              overview.grossMarginTrend === "down" ? "text-rose-600" : "text-emerald-600"
            )}
          >
            {overview.grossMarginTrend === "down" ? (
              <AlertCircle className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            )}
            {overview.grossMarginLabel}
          </span>
        </div>

        {/* Return & RTO Rate */}
        <div className="flex flex-col border-stone-100 sm:border-l sm:pl-4">
          <span className="text-xs font-medium text-stone-500">Return &amp; RTO Rate</span>
          <span className="mt-0.5 text-lg sm:text-xl font-bold text-stone-900">
            {overview.returnRtoRatePercent}%
          </span>
          <span className="mt-1 text-xs font-medium text-stone-500 truncate">
            {overview.returnRtoComparisonText}
          </span>
        </div>
      </div>

      {/* SVG Interactive Spline Chart */}
      <div className="relative mt-8 sm:mt-10 w-full select-none pt-2 overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-60 sm:h-76 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Emerald Green Area Gradient (Upward Margin/Trend) */}
            <linearGradient id="greenAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#22c55e" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.01" />
            </linearGradient>

            {/* Crimson Red Area Gradient (Downward Margin/Trend) */}
            <linearGradient id="redAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#f87171" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & scale ticks */}
          {gridLevels.map((lvl, idx) => {
            const yPos = height - paddingBottom - lvl * chartHeight;
            const labelVal = Math.round(maxVal * lvl);
            const displayLabel =
              viewMode === "revenue" ? `₹${Math.round(labelVal / 1000)}k` : `${labelVal}`;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={yPos}
                  x2={width - paddingX}
                  y2={yPos}
                  stroke="#e7e5e4"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 12}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-[11px] fill-stone-400 font-medium"
                >
                  {displayLabel}
                </text>
              </g>
            );
          })}

          {/* Segment Area Fills (Green when going Up, Red when going Down) */}
          {segments.map((seg) => (
            <path
              key={`area-${seg.index}`}
              d={seg.areaPath}
              fill={seg.isUp ? "url(#greenAreaGradient)" : "url(#redAreaGradient)"}
              className="transition-all duration-300"
            />
          ))}

          {/* Segment Glows */}
          {segments.map((seg) => (
            <path
              key={`glow-${seg.index}`}
              d={seg.path}
              fill="none"
              stroke={seg.isUp ? "#22c55e" : "#f87171"}
              strokeWidth="7"
              strokeOpacity="0.22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Segment Crisp Lines (Green when going Up, Red when going Down) */}
          {segments.map((seg) => (
            <path
              key={`line-${seg.index}`}
              d={seg.path}
              fill="none"
              stroke={seg.isUp ? "#16a34a" : "#ef4444"}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          ))}

          {/* Active / Peak Drop Line & Indicator */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                y1={activePt.y}
                x2={activePt.x}
                y2={height - paddingBottom}
                stroke={isActiveUp ? "#16a34a" : "#ef4444"}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Outer pulsing ring */}
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="10"
                fill={isActiveUp ? "#22c55e" : "#ef4444"}
                opacity="0.25"
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="6"
                fill="#ffffff"
                stroke={isActiveUp ? "#15803d" : "#dc2626"}
                strokeWidth="3"
                className="transition-all duration-150"
              />
            </g>
          )}

          {/* Interactive Hover Zones & Points */}
          {points.map((pt, i) => {
            const isPtUp = i === 0 || pt.val >= points[i - 1].val;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={pt.x - chartWidth / (points.length * 2)}
                  y={0}
                  width={chartWidth / points.length}
                  height={height}
                  fill="transparent"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === i ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke={isPtUp ? "#16a34a" : "#ef4444"}
                  strokeWidth="2.5"
                  opacity={hoveredIndex === i || pt.data.isPeak ? 1 : 0.65}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Bubble for Active/Peak Point */}
        {activePt && (
          <div
            className="pointer-events-none absolute z-30 transition-all duration-200"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: `translate(${translateX}, ${translateY})`,
            }}
          >
            <div className="rounded-xl bg-stone-900/95 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-xs ring-1 ring-white/10 min-w-48 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-stone-300">
                  {activePt.data.label || activePt.data.date}
                </span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    isActiveUp ? "bg-emerald-400" : "bg-rose-400"
                  )}
                ></span>
              </div>
              <div className="text-sm font-extrabold text-white mt-1">
                {viewMode === "revenue"
                  ? formatPrice(activePt.data.revenue)
                  : `${activePt.data.orders} Orders`}
              </div>
              {activeIndex > 0 && (
                <div
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-1 mt-0.5",
                    isActiveUp ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {isActiveUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>
                    {isActiveUp ? "+" : "-"}
                    {viewMode === "revenue"
                      ? formatPrice(Math.abs(activeDiff))
                      : `${Math.abs(activeDiff)} Orders`}{" "}
                    ({activePercent}%)
                  </span>
                  <span className="text-stone-400 text-[10px] font-normal">vs prev</span>
                </div>
              )}
              <div className="text-[11px] text-stone-300 font-medium truncate mt-1 pt-1 border-t border-stone-800">
                {activePt.data.orders} Orders &bull; Top:{" "}
                {activePt.data.topProduct || "Salem Banana Chips"}
              </div>
            </div>
          </div>
        )}

        {/* X-Axis Date Labels */}
        <div className="mt-2 flex justify-between px-6 text-[11px] font-semibold text-stone-500">
          {safeData.map((item, idx) => {
            const isSelected = idx === activeIndex;
            const isItemUp = idx === 0 || values[idx] >= values[idx - 1];
            return (
              <button
                key={`${item.date}-${idx}`}
                type="button"
                onClick={() => setHoveredIndex(idx)}
                className={cn(
                  "transition-colors text-center cursor-pointer px-1 py-0.5 rounded",
                  isSelected
                    ? isItemUp
                      ? "font-bold text-emerald-700 underline underline-offset-4 bg-emerald-50/60"
                      : "font-bold text-rose-700 underline underline-offset-4 bg-rose-50/60"
                    : "hover:text-stone-900"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
