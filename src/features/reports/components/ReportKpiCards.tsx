"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ReportKpiItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "neutral";
}

interface ReportKpiCardsProps {
  items: ReportKpiItem[];
  columns?: 2 | 3 | 4;
}

export function ReportKpiCards({ items, columns = 4 }: ReportKpiCardsProps) {
  const gridColsClass =
    columns === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : columns === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-4", gridColsClass)}>
      {items.map((item, idx) => (
        <Card key={idx} className="relative overflow-hidden border border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.title}
              </span>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {item.value}
              </span>
              {item.badge && (
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    item.badgeVariant === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : item.badgeVariant === "warning"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : item.badgeVariant === "danger"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </div>

            {item.subtitle && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {item.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
