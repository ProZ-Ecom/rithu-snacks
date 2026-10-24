import { ApiError } from "@/lib/api/api-error";
import { couponRepository } from "../repositories/coupon.repository";
import type {
  GetCouponsParams,
  CreateCouponInput,
  UpdateCouponInput,
  CouponCalculationResult,
} from "../types";

export const couponService = {
  async getCoupons(params: GetCouponsParams = {}) {
    return couponRepository.findAll(params);
  },

  async getCoupon(id: number) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }
    return coupon;
  },

  async createCoupon(data: CreateCouponInput) {
    const code = data.code.trim().toUpperCase();
    const existing = await couponRepository.findByCode(code);
    if (existing) {
      throw ApiError.conflict("A coupon with this code already exists");
    }

    if (data.startsAt && data.expiresAt && new Date(data.expiresAt) < new Date(data.startsAt)) {
      throw ApiError.badRequest("Expiry date cannot be earlier than start date");
    }

    const couponType =
      String(data.type).toLowerCase() === "percentage" ? ("percentage" as const) : ("flat" as const);

    return couponRepository.create({
      code,
      type: couponType,
      value: data.value,
      minOrderAmount: data.minOrderAmount ?? 0,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      usageLimitPerUser: data.usageLimitPerUser ?? 1,
      isFirstOrderOnly: Boolean(data.isFirstOrderOnly),
      isActive: data.isActive ?? true,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
    });
  },

  async updateCoupon(id: number, data: UpdateCouponInput) {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound("Coupon not found");
    }

    const code = data.code !== undefined ? data.code.trim().toUpperCase() : undefined;
    if (code && code !== existing.code) {
      const codeExists = await couponRepository.findByCode(code);
      if (codeExists) {
        throw ApiError.conflict("A coupon with this code already exists");
      }
    }

    const effectiveStartsAt = data.startsAt !== undefined ? data.startsAt : existing.startsAt;
    const effectiveExpiresAt = data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt;
    if (
      effectiveStartsAt &&
      effectiveExpiresAt &&
      new Date(effectiveExpiresAt) < new Date(effectiveStartsAt)
    ) {
      throw ApiError.badRequest("Expiry date cannot be earlier than start date");
    }

    const updateData: Record<string, unknown> = {};
    if (code !== undefined) updateData.code = code;
    if (data.type !== undefined) {
      updateData.type =
        String(data.type).toLowerCase() === "percentage" ? "percentage" : "flat";
    }
    if (data.value !== undefined) updateData.value = data.value;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
    if (data.maxDiscount !== undefined) updateData.maxDiscount = data.maxDiscount;
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
    if (data.usageLimitPerUser !== undefined) updateData.usageLimitPerUser = data.usageLimitPerUser;
    if (data.isFirstOrderOnly !== undefined) updateData.isFirstOrderOnly = data.isFirstOrderOnly;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    return couponRepository.update(id, updateData as never);
  },

  async deleteCoupon(id: number) {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound("Coupon not found");
    }
    return couponRepository.delete(id);
  },

  /**
   * Validate coupon code against a specific customer and cart subtotal.
   * Calculates discount with all business and usage rules.
   */
  async validateAndCalculateDiscount(
    code: string,
    userId: bigint | string | number,
    cartSubtotal: number,
    txClient?: any
  ): Promise<CouponCalculationResult> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      throw ApiError.badRequest("Please enter a valid coupon code");
    }

    const coupon = await couponRepository.findRawByCode(cleanCode);
    if (!coupon) {
      throw ApiError.badRequest(`Coupon code "${cleanCode}" is invalid`);
    }

    return this.evaluateCouponRules(coupon, userId, cartSubtotal, txClient);
  },

  /**
   * Validate an existing applied coupon by ID (used during cart re-fetch & checkout)
   */
  async validateCouponById(
    couponId: bigint | number,
    userId: bigint | string | number,
    cartSubtotal: number,
    txClient?: any
  ): Promise<CouponCalculationResult | null> {
    const coupon = await couponRepository.findRawById(couponId);
    if (!coupon) return null;

    try {
      return await this.evaluateCouponRules(coupon, userId, cartSubtotal, txClient);
    } catch {
      return null;
    }
  },

  /**
   * Core evaluator for all coupon constraints
   */
  async evaluateCouponRules(
    coupon: any,
    userId: bigint | string | number,
    cartSubtotal: number,
    txClient?: any
  ): Promise<CouponCalculationResult> {
    const uid = BigInt(userId);

    // 1. Active status check
    if (!coupon.isActive) {
      throw ApiError.badRequest(`Coupon "${coupon.code}" is no longer active`);
    }

    // 2. Date window check
    const now = new Date();
    if (coupon.valid_from && now < new Date(coupon.valid_from)) {
      throw ApiError.badRequest(`Coupon "${coupon.code}" is not yet active`);
    }
    if (coupon.valid_to && now > new Date(coupon.valid_to)) {
      throw ApiError.badRequest(`Coupon "${coupon.code}" has expired`);
    }

    // 3. Minimum order amount check
    const minOrder = Number(coupon.minOrderAmount ?? 0);
    if (minOrder > 0 && cartSubtotal < minOrder) {
      throw ApiError.badRequest(
        `Minimum order amount of ₹${minOrder} is required to use coupon "${coupon.code}"`
      );
    }

    // 4. First order only check
    if (coupon.is_first_order_only) {
      const pastOrders = await couponRepository.getUserPastOrdersCount(uid, txClient);
      if (pastOrders > 0) {
        throw ApiError.badRequest(
          `Coupon "${coupon.code}" is exclusively valid on your first order`
        );
      }
    }

    // 5. Global storewide usage limit check (First-Come, First-Served)
    if (coupon.usageLimit != null && coupon.usageLimit > 0) {
      const totalUsed = await couponRepository.getTotalUsageCount(coupon.id, txClient);
      if (totalUsed >= coupon.usageLimit) {
        throw ApiError.badRequest(
          `Coupon "${coupon.code}" has reached its maximum usage limit`
        );
      }
    }

    // 6. Per-user usage limit check
    const maxPerUser = coupon.usage_limit_per_user ?? 1;
    const userUsedCount = await couponRepository.getUserUsageCount(coupon.id, uid, txClient);
    if (userUsedCount >= maxPerUser) {
      throw ApiError.badRequest(
        maxPerUser === 1
          ? `You have already used coupon "${coupon.code}"`
          : `You have reached the maximum limit of ${maxPerUser} uses for coupon "${coupon.code}"`
      );
    }

    // 7. Calculate discount
    let discountAmount = 0;
    const couponValue = Number(coupon.value);
    const couponType = String(coupon.type).toLowerCase();

    if (couponType === "percentage") {
      discountAmount = (cartSubtotal * couponValue) / 100;
      if (coupon.max_discount_amount != null) {
        const maxCap = Number(coupon.max_discount_amount);
        if (maxCap > 0 && discountAmount > maxCap) {
          discountAmount = maxCap;
        }
      }
    } else {
      // Fixed / Flat amount
      discountAmount = Math.min(couponValue, cartSubtotal);
    }

    // Round to 2 decimal places and cap to cart subtotal
    discountAmount = Math.min(cartSubtotal, Math.round(discountAmount * 100) / 100);

    return {
      isValid: true,
      couponId: Number(coupon.id),
      code: coupon.code,
      type: couponType === "percentage" ? "percentage" : "flat",
      value: couponValue,
      discountAmount,
      minOrderAmount: minOrder,
      maxDiscount: coupon.max_discount_amount != null ? Number(coupon.max_discount_amount) : null,
      isFirstOrderOnly: Boolean(coupon.is_first_order_only),
    };
  },
};
