import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { revenueReportService, type RevenueFilters } from "@/features/reports/services/revenue-report.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const searchParams = context.searchParams;
      const filters: RevenueFilters = {
        dateFrom: searchParams?.get("dateFrom") ?? undefined,
        dateTo: searchParams?.get("dateTo") ?? undefined,
        paymentMethod: searchParams?.get("paymentMethod") ?? undefined,
        search: searchParams?.get("search") ?? undefined,
        page: searchParams?.get("page") ?? "1",
        limit: searchParams?.get("limit") ?? "10",
        tab: searchParams?.get("tab") ?? undefined,
      };
      return apiSuccess(await revenueReportService.summary(filters));
    },
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
