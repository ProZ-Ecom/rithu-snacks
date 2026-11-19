"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import type { ExportColumn } from "@/lib/excel-export";

interface ReportHeaderProps<T = any> {
  title: string;
  description: string;
  reportName: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  exportData?: T[];
  exportColumns?: ExportColumn<T>[];
  exportFileName?: string;
  exportSheetName?: string;
}

export function ReportHeader<T = any>({
  title,
  description,
  reportName,
  onRefresh,
  isRefreshing = false,
  exportData,
  exportColumns,
  exportFileName,
  exportSheetName,
}: ReportHeaderProps<T>) {
  return (
    <div className="flex flex-col gap-4 mb-2">
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={
          <AdminBreadcrumb
            items={[
              { label: "Reports", href: "/admin/dashboard/reports" },
              { label: reportName },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard/reports">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                All Reports
              </Button>
            </Link>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}

            {exportData && exportColumns && (
              <ExportExcelButton
                data={exportData}
                columns={exportColumns}
                filename={exportFileName || `${reportName.toLowerCase().replace(/\s+/g, "_")}_report`}
                sheetName={exportSheetName || reportName}
                size="sm"
                label="Export Excel"
                variant="default"
              />
            )}
          </div>
        }
      />
    </div>
  );
}
