import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { cartService } from "@/features/cart/services/cart.service";
import { applyCouponSchema, type ApplyCouponInput } from "@/features/coupons/validations/coupon.schema";

export const POST = createApiHandler(
  {
    POST: async (_request, context) => {
      const sessionUserId = context.session?.user?.id;
      if (!sessionUserId) {
        throw ApiError.unauthorized("Please login to apply coupons");
      }

      const body = context.body as ApplyCouponInput;
      const updatedCart = await cartService.applyCoupon(sessionUserId, body.code);
      return apiSuccess(
        updatedCart,
        `Coupon "${body.code.toUpperCase()}" applied successfully!`,
        200
      );
    },
  },
  {
    requireAuth: true,
    bodySchema: applyCouponSchema,
  }
);

export const DELETE = createApiHandler(
  {
    DELETE: async (_request, context) => {
      const sessionUserId = context.session?.user?.id;
      if (!sessionUserId) {
        throw ApiError.unauthorized("Please login to manage your cart");
      }

      const updatedCart = await cartService.removeCoupon(sessionUserId);
      return apiSuccess(updatedCart, "Coupon removed successfully", 200);
    },
  },
  {
    requireAuth: true,
  }
);
