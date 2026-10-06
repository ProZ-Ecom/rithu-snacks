"use client";

import * as React from "react";
import { Truck, CheckCircle2, Award } from "lucide-react";
import type { PipelineStage } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface OrderPipelineFunnelProps {
  pipeline: PipelineStage[];
  totalOrdersCount?: number;
  successRate?: number;
  hubSla?: number;
}

const STAGE_DOT_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  processing: "bg-purple-500",
  shipped: "bg-teal-500",
  delivered: "bg-emerald-600",
  cancelled: "bg-rose-500",
};

export function OrderPipelineFunnel({
  pipeline,
  totalOrdersCount = 0,
  successRate = 100,
  hubSla = 100,
}: OrderPipelineFunnelProps) {
  const maxCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Order Pipeline
            </h2>
            <p className="text-xs text-stone-500">
              Real-time fulfillment status of {totalOrdersCount.toLocaleString("en-IN")} lifetime batches
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/15">
            <Truck className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Pipeline Bars List */}
        <div className="mt-5 space-y-3.5">
          {pipeline.map((stage) => {
            const dotColor = STAGE_DOT_COLORS[stage.id] || "bg-stone-500";
            const barWidth = stage.count > 0 ? Math.max((stage.count / maxCount) * 100, 3) : 0;

            return (
              <div key={stage.id} className="group flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs", dotColor)}></span>
                    <span className="font-semibold text-stone-800">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-stone-900">
                      {stage.count.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      orders {stage.id === "cancelled" && `(${stage.percentage}%)`}
                    </span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 p-0.5">
                  {stage.count > 0 && (
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        dotColor
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer SLA & Quality Stats */}
      <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50/80 px-3 py-1.5 rounded-xl ring-1 ring-emerald-600/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successRate}% Successful Pipeline</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-600 font-medium px-2 py-1 bg-stone-50 rounded-lg">
          <Award className="h-3.5 w-3.5 text-amber-600" />
          <span>Hub SLA: <strong className="text-stone-900 font-bold">{hubSla}%</strong></span>
        </div>
      </div>
    </div>
  );
}
