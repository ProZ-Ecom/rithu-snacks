import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ordersReportService, type OrdersFilters } from "@/features/reports/services/orders-report.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const searchParams = context.searchParams;
      const filters: OrdersFilters = {
        dateFrom: searchParams?.get("dateFrom") ?? undefined,
        dateTo: searchParams?.get("dateTo") ?? undefined,
        status: searchParams?.get("status") ?? undefined,
        paymentStatus: searchParams?.get("paymentStatus") ?? undefined,
        search: searchParams?.get("search") ?? undefined,
        page: searchParams?.get("page") ?? "1",
        limit: searchParams?.get("limit") ?? "10",
      };
      return apiSuccess(await ordersReportService.summary(filters));
    },
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
