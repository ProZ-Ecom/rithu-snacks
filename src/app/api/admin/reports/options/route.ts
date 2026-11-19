import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { reportOptionsService } from "@/features/reports/services/report-options.service";

export const GET = createApiHandler(
  {
    GET: async () => apiSuccess(await reportOptionsService.all()),
  },
  { requireAuth: true, requiredRole: ["ADMIN", "STAFF"] }
);
