import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { razorpaySettlementsService } from "@/features/payment/services/razorpay-settlements.service";

/**
 * GET /api/admin/payments/settlements
 * Fetch live Razorpay settlements, payments, refunds and local DB metrics for finance reconciliation.
 */
export const GET = createApiHandler(
  {
    GET: async (req) => {
      const { searchParams } = new URL(req.url);
      const days = Number(searchParams.get("days")) || 30;

      const data = await razorpaySettlementsService.getDashboardData(days);
      return apiSuccess(data, "Settlement data fetched successfully");
    },
  },
  {
    requireAuth: true,
    requiredRole: ["ADMIN", "SUPER_ADMIN", "STAFF"],
  }
);
