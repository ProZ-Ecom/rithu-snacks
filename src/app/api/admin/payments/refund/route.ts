import { z } from "zod";
import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { db } from "@/lib/db/prisma";
import { razorpayService } from "@/features/payment/services/razorpay.service";

const refundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

type RefundInput = z.infer<typeof refundSchema>;

/**
 * POST /api/admin/payments/refund
 * Process full or partial refund via Razorpay and update local order/payment tables.
 */
export const POST = createApiHandler(
  {
    POST: async (_req, context) => {
      const body = context.body as RefundInput;
      const isNumeric = /^\d+$/.test(body.orderId);

      const order = await db.order.findFirst({
        where: {
          OR: [
            { uuid: body.orderId },
            { orderNumber: body.orderId },
            ...(isNumeric ? [{ id: BigInt(body.orderId) }] : []),
          ],
        },
      });

      if (!order) {
        throw ApiError.notFound("Order not found");
      }

      if (order.payment_status !== "paid" && order.payment_status !== "partial_refund") {
        throw ApiError.badRequest(
          `Cannot refund order with payment status "${order.payment_status}".`
        );
      }

      const result = await razorpayService.refundPayment({
        orderId: order.id,
        amount: body.amount,
        reason: body.reason,
      });

      return apiSuccess(result, "Refund processed successfully");
    },
  },
  {
    requireAuth: true,
    requiredRole: ["ADMIN", "SUPER_ADMIN"],
    bodySchema: refundSchema,
  }
);
