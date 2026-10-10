export interface CouponListItem {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  isFirstOrderOnly: boolean;
  usedCount: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface GetCouponsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface GetCouponsResult {
  data: CouponListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateCouponInput {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  isFirstOrderOnly?: boolean;
  isActive?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {}

export interface CouponCalculationResult {
  isValid: boolean;
  couponId: number;
  code: string;
  type: "flat" | "percentage";
  value: number;
  discountAmount: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  isFirstOrderOnly: boolean;
  message?: string;
}
