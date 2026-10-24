import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { orderService } from "@/features/orders/services/order.service";
import {
  shipOrderCourierSchema,
  type ShipOrderCourierInput,
} from "@/features/orders/validations/order.schema";

export const POST = createApiHandler(
  {
    POST: async (_request, context) => {
      const sessionUserId = context.session?.user?.id;
      if (!sessionUserId) {
        throw ApiError.unauthorized("Unauthorized");
      }

      const uuid = context.params?.uuid;
      if (!uuid || typeof uuid !== "string") {
        throw ApiError.badRequest("Invalid order UUID");
      }

      const body = context.body as ShipOrderCourierInput;
      const result = await orderService.shipOrderWithCourier(
        sessionUserId,
        uuid,
        body
      );

      return apiSuccess(result, "Order shipped with courier successfully", 200);
    },
  },
  {
    requireAuth: true,
    requiredRole: ["ADMIN", "STAFF"],
    bodySchema: shipOrderCourierSchema,
  }
);
