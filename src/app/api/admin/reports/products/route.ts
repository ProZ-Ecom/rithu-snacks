import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { productsReportService, type ProductsFilters } from "@/features/reports/services/products-report.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const searchParams = context.searchParams;
      const filters: ProductsFilters = {
        dateFrom: searchParams?.get("dateFrom") ?? undefined,
        dateTo: searchParams?.get("dateTo") ?? undefined,
        category: searchParams?.get("category") ?? undefined,
        brand: searchParams?.get("brand") ?? undefined,
        search: searchParams?.get("search") ?? undefined,
        page: searchParams?.get("page") ?? "1",
        limit: searchParams?.get("limit") ?? "10",
        tab: searchParams?.get("tab") ?? undefined,
      };
      return apiSuccess(await productsReportService.summary(filters));
    },
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
