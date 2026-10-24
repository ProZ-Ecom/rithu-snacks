import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";
import type { GetCouponsParams, CouponListItem } from "../types";

function toCouponListItem(coupon: Record<string, unknown>): CouponListItem {
  return {
    id: Number(coupon.id),
    code: coupon.code as string,
    type: coupon.type as string,
    value: Number(coupon.value),
    minOrderAmount: coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null,
    maxDiscount: (coupon.maxDiscount ?? coupon.max_discount_amount) != null ? Number(coupon.maxDiscount ?? coupon.max_discount_amount) : null,
    usageLimit: (coupon.usageLimit ?? coupon.usage_limit) as number | null,
    usageLimitPerUser: (coupon.usageLimitPerUser ?? coupon.usage_limit_per_user ?? 1) as number,
    isFirstOrderOnly: Boolean(coupon.isFirstOrderOnly ?? coupon.is_first_order_only),
    usedCount: ((coupon._count as any)?.coupon_usage ?? coupon.usedCount ?? 0) as number,
    isActive: Boolean(coupon.isActive),
    startsAt: ((coupon.startsAt ?? coupon.valid_from) as Date | null) ?? null,
    expiresAt: ((coupon.expiresAt ?? coupon.valid_to) as Date | null) ?? null,
    createdAt: coupon.createdAt as Date,
  };
}

function buildCouponWhere(params: GetCouponsParams): Prisma.CouponWhereInput {
  const where: Prisma.CouponWhereInput = {};

  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  if (params.search) {
    where.OR = [{ code: { contains: params.search } }];
  }

  return where;
}

export const couponRepository = {
  async findAll(params: GetCouponsParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const where = buildCouponWhere(params);

    const [data, total] = await Promise.all([
      db.coupon.findMany({
        where,
        include: { _count: { select: { coupon_usage: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.coupon.count({ where }),
    ]);

    return {
      data: data.map((c) => toCouponListItem(c as unknown as Record<string, unknown>)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id: number | bigint) {
    const coupon = await db.coupon.findUnique({
      where: { id: BigInt(id) },
      include: { _count: { select: { coupon_usage: true } } },
    });
    return coupon ? toCouponListItem(coupon as unknown as Record<string, unknown>) : null;
  },

  async findByCode(code: string) {
    const coupon = await db.coupon.findUnique({
      where: { code },
      include: { _count: { select: { coupon_usage: true } } },
    });
    return coupon ? toCouponListItem(coupon as unknown as Record<string, unknown>) : null;
  },

  async findRawByCode(code: string) {
    return db.coupon.findUnique({
      where: { code },
    });
  },

  async findRawById(id: bigint | number) {
    return db.coupon.findUnique({
      where: { id: BigInt(id) },
    });
  },

  async getUserUsageCount(couponId: bigint, userId: bigint, txClient: Prisma.TransactionClient | typeof db = db) {
    return txClient.coupon_usage.count({
      where: {
        coupon_id: couponId,
        user_id: userId,
        is_active: true,
      },
    });
  },

  async getTotalUsageCount(couponId: bigint, txClient: Prisma.TransactionClient | typeof db = db) {
    return txClient.coupon_usage.count({
      where: {
        coupon_id: couponId,
        is_active: true,
      },
    });
  },

  async getUserPastOrdersCount(userId: bigint, txClient: Prisma.TransactionClient | typeof db = db) {
    return txClient.order.count({
      where: {
        userId,
        order_status: { notIn: ["cancelled"] },
        is_active: true,
      },
    });
  },

  async create(data: any) {
    let coupon: any;
    try {
      coupon = await db.coupon.create({
        data: {
          uuid: crypto.randomUUID(),
          code: data.code,
          type: data.type,
          value: data.value,
          minOrderAmount: data.minOrderAmount ?? 0,
          max_discount_amount: data.maxDiscount ?? data.max_discount_amount ?? null,
          usageLimit: data.usageLimit ?? null,
          usage_limit_per_user: data.usageLimitPerUser ?? 1,
          is_first_order_only: Boolean(data.isFirstOrderOnly),
          isActive: data.isActive ?? true,
          valid_from: data.startsAt ?? data.valid_from ?? null,
          valid_to: data.expiresAt ?? data.valid_to ?? null,
        },
      });
    } catch (err: any) {
      if (err?.message?.includes("is_first_order_only")) {
        coupon = await db.coupon.create({
          data: {
            uuid: crypto.randomUUID(),
            code: data.code,
            type: data.type,
            value: data.value,
            minOrderAmount: data.minOrderAmount ?? 0,
            max_discount_amount: data.maxDiscount ?? data.max_discount_amount ?? null,
            usageLimit: data.usageLimit ?? null,
            usage_limit_per_user: data.usageLimitPerUser ?? 1,
            isActive: data.isActive ?? true,
            valid_from: data.startsAt ?? data.valid_from ?? null,
            valid_to: data.expiresAt ?? data.valid_to ?? null,
          },
        });
        if (data.isFirstOrderOnly) {
          await db.$executeRawUnsafe(
            "UPDATE coupons SET is_first_order_only = 1 WHERE id = ?",
            coupon.id
          );
          coupon.is_first_order_only = true;
        }
      } else {
        throw err;
      }
    }
    return toCouponListItem(coupon as unknown as Record<string, unknown>);
  },

  async update(id: number | bigint, data: any) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
    if (data.maxDiscount !== undefined || data.max_discount_amount !== undefined) {
      updateData.max_discount_amount = data.maxDiscount ?? data.max_discount_amount ?? null;
    }
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
    if (data.usageLimitPerUser !== undefined) updateData.usage_limit_per_user = data.usageLimitPerUser;
    if (data.isFirstOrderOnly !== undefined) updateData.is_first_order_only = Boolean(data.isFirstOrderOnly);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.startsAt !== undefined || data.valid_from !== undefined) {
      updateData.valid_from = data.startsAt ?? data.valid_from ?? null;
    }
    if (data.expiresAt !== undefined || data.valid_to !== undefined) {
      updateData.valid_to = data.expiresAt ?? data.valid_to ?? null;
    }

    let coupon: any;
    try {
      coupon = await db.coupon.update({ where: { id: BigInt(id) }, data: updateData });
    } catch (err: any) {
      if (err?.message?.includes("is_first_order_only") && "is_first_order_only" in updateData) {
        const isFirst = updateData.is_first_order_only;
        delete updateData.is_first_order_only;
        coupon = await db.coupon.update({ where: { id: BigInt(id) }, data: updateData });
        await db.$executeRawUnsafe(
          "UPDATE coupons SET is_first_order_only = ? WHERE id = ?",
          isFirst ? 1 : 0,
          BigInt(id)
        );
        coupon.is_first_order_only = Boolean(isFirst);
      } else {
        throw err;
      }
    }
    return toCouponListItem(coupon as unknown as Record<string, unknown>);
  },

  async delete(id: number | bigint) {
    return db.coupon.delete({ where: { id: BigInt(id) } });
  },
};
