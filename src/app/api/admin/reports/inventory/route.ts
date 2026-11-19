import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { inventoryReportService, type InventoryFilters } from "@/features/reports/services/inventory-report.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const searchParams = context.searchParams;
      const filters: InventoryFilters = {
        dateFrom: searchParams?.get("dateFrom") ?? undefined,
        dateTo: searchParams?.get("dateTo") ?? undefined,
        category: searchParams?.get("category") ?? undefined,
        brand: searchParams?.get("brand") ?? undefined,
        bucket: searchParams?.get("bucket") ?? undefined,
        search: searchParams?.get("search") ?? undefined,
        page: searchParams?.get("page") ?? "1",
        limit: searchParams?.get("limit") ?? "10",
      };
      return apiSuccess(await inventoryReportService.summary(filters));
    },
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
