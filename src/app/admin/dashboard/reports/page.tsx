"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminContent, AdminPageHeader } from "@/components/admin/AdminPageHeader";

const reports = [
  {
    title: "Sales",
    question: "How much did we sell, and where did it come from?",
    icon: BarChart3,
    href: "/admin/dashboard/reports/sales",
    includes: ["Sales and orders over time", "By category and brand", "Top products and customers"],
  },
  {
    title: "Orders",
    question: "Where are orders stuck, and why do they fall through?",
    icon: ShoppingCart,
    href: "/admin/dashboard/reports/orders",
    includes: ["Pipeline by stage", "Cancellation and return reasons", "Average delivery time"],
  },
  {
    title: "Revenue",
    question: "What was billed, what came in, what is still owed?",
    icon: DollarSign,
    href: "/admin/dashboard/reports/revenue",
    includes: ["Collected vs outstanding", "HSN-wise tax summary", "Payment methods and refunds"],
  },
  {
    title: "Products",
    question: "What sells, what does not, and what actually earns?",
    icon: Package,
    href: "/admin/dashboard/reports/products",
    includes: ["Per-SKU revenue and volume", "Best sellers and slow movers", "SKUs that sold nothing"],
  },
  {
    title: "Customers",
    question: "Who buys, who comes back, who has gone quiet?",
    icon: Users,
    href: "/admin/dashboard/reports/customers",
    includes: ["New vs returning buyers", "Top customers and locations", "Customers at risk of churn"],
  },
  {
    title: "Inventory",
    question: "What are we holding, and what needs reordering?",
    icon: Warehouse,
    href: "/admin/dashboard/reports/inventory",
    includes: ["Stock valuation", "Low, out and dead stock", "Full movement ledger"],
  },
];

export default function ReportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Pick a question to answer. Every report has date presets, comparison against the period before, and a CSV download."
        breadcrumbs={
          <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Reports" }]} />
        }
      />

      <AdminContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-theme-primary/50 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 transition-colors group-hover:bg-theme-primary group-hover:text-white">
                  <report.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-neutral-900">{report.title}</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{report.question}</p>
                </div>
              </div>

              <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                {report.includes.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-neutral-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-300" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>

              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-theme-primary">
                Open report
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </AdminContent>
    </div>
  );
}
