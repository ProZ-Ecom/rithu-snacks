"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, CreditCard, Banknote, Smartphone } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { RecentOrderDto } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface RecentDispatchOrdersSectionProps {
  orders: RecentOrderDto[];
  totalOrdersCount?: number;
}

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-600/20" },
  processing: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20" },
  shipped: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-600/20" },
  pending: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-600/20" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-600/20" },
  returned: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-600/20" },
};

export function RecentDispatchOrdersSection({
  orders,
  totalOrdersCount = 0,
}: RecentDispatchOrdersSectionProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "shipped">("all");

  const filteredOrders = orders.filter((order) => {
    if (filter === "pending") return order.status === "pending" || order.status === "processing";
    if (filter === "paid") return order.status !== "pending" && order.status !== "cancelled";
    if (filter === "shipped") return order.status === "shipped" || order.status === "delivered";
    return true;
  });

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Recent Dispatch Orders
          </h2>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
            {filteredOrders.length} of {totalOrdersCount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Filter Pills & View All */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
          <div className="inline-flex items-center rounded-xl bg-stone-100/90 p-1 border border-stone-200/80">
            {(["all", "pending", "paid", "shipped"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer",
                  filter === tab
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <Link
            href="/admin/dashboard/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors shrink-0"
          >
            <span>View All Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-stone-200/80 text-[11px] font-bold tracking-wider text-stone-500 uppercase">
              <th className="py-3 px-3">Order ID</th>
              <th className="py-3 px-3">Customer &amp; Town</th>
              <th className="py-3 px-3">Basket Items</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Time</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-stone-500 font-medium">
                  No orders found in this timeframe.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const statusStyle =
                  STATUS_BADGE_STYLES[order.status] || {
                    bg: "bg-stone-50",
                    text: "text-stone-700",
                    ring: "ring-stone-600/20",
                  };

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-amber-50/30 transition-colors group"
                  >
                    {/* Order ID */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/15">
                        {order.orderNumber}
                      </span>
                    </td>

                    {/* Customer & Town */}
                    <td className="py-3.5 px-3 min-w-36">
                      <div className="font-bold text-stone-900 leading-tight">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {order.city}, {order.state}
                      </div>
                    </td>

                    {/* Basket Items */}
                    <td className="py-3.5 px-3 max-w-xs truncate text-xs text-stone-700 font-medium">
                      {order.basketSummary}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-extrabold text-stone-900">
                      {formatPrice(order.amount)}
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span>{order.paymentMethod}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1",
                          statusStyle.bg,
                          statusStyle.text,
                          statusStyle.ring
                        )}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-stone-500">
                      {order.placedTime}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/dashboard/orders`}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300 transition-all shadow-2xs"
                      >
                        <span>View Order</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
