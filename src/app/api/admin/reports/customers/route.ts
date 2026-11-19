import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { customersReportService, type CustomersFilters } from "@/features/reports/services/customers-report.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const searchParams = context.searchParams;
      const filters: CustomersFilters = {
        dateFrom: searchParams?.get("dateFrom") ?? undefined,
        dateTo: searchParams?.get("dateTo") ?? undefined,
        customerType: searchParams?.get("customerType") ?? undefined,
        search: searchParams?.get("search") ?? undefined,
        page: searchParams?.get("page") ?? "1",
        limit: searchParams?.get("limit") ?? "10",
        tab: searchParams?.get("tab") ?? undefined,
      };
      return apiSuccess(await customersReportService.summary(filters));
    },
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
