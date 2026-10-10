import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";

export const cartItemInclude = Prisma.validator<Prisma.CartItemInclude>()({
  product: {
    select: {
      id: true,
      uuid: true,
      name: true,
      isActive: true,
      deleted_at: true,
      images: {
        where: { is_active: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  },
  variant_unit_price: {
    select: {
      id: true,
      uuid: true,
      sku: true,
      base_price: true,
      unit_value: true,
      is_default: true,
      isActive: true,
      deleted_at: true,
      product_units: {
        select: {
          id: true,
          uuid: true,
          name: true,
          code: true,
          type: true,
        },
      },
      variant: {
        select: {
          id: true,
          uuid: true,
          variant_name: true,
          isActive: true,
          deleted_at: true,
          product_variant_images: {
            where: { is_active: true },
            orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            take: 1,
          },
        },
      },
    },
  },
});

export const cartInclude = Prisma.validator<Prisma.CartInclude>()({
  coupons: true,
  items: {
    where: {
      is_active: true,
      variant_unit_price: {
        isActive: true,
        deleted_at: null,
        variant: {
          isActive: true,
          deleted_at: null,
        },
      },
      product: {
        isActive: true,
        deleted_at: null,
      },
    },
    include: cartItemInclude,
    orderBy: { createdAt: "desc" },
  },
});

export const cartRepository = {
  async findActiveCartByUserId(userId: bigint) {
    return db.cart.findFirst({
      where: {
        userId,
        status: "active",
        is_active: true,
      },
      include: cartInclude,
    });
  },

  async getOrCreateActiveCart(
    userId: bigint,
    adminOrUserId?: bigint,
    prismaClient: Prisma.TransactionClient | typeof db = db
  ) {
    const existing = await prismaClient.cart.findFirst({
      where: {
        userId,
        status: "active",
        is_active: true,
      },
      include: cartInclude,
    });

    if (existing) {
      return existing;
    }

    return prismaClient.cart.create({
      data: {
        uuid: crypto.randomUUID(),
        userId,
        status: "active",
        is_active: true,
        last_activity_at: new Date(),
        created_by: adminOrUserId,
        updated_by: adminOrUserId,
      },
      include: cartInclude,
    });
  },

  async addItemToCart(params: {
    userId: bigint;
    productId: bigint;
    variantId: bigint;
    variantUnitPriceId?: bigint | null;
    quantity: number;
    currentPrice: number;
    adminOrUserId?: bigint;
  }) {
    return db.$transaction(async (tx) => {
      // 1. Get or create active cart
      const cart = await this.getOrCreateActiveCart(
        params.userId,
        params.adminOrUserId,
        tx
      );

      // 2. Check if item exists in this cart (active or inactive)
      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          variantId: params.variantId,
          ...(params.variantUnitPriceId ? { variantUnitPriceId: params.variantUnitPriceId } : {}),
        },
      });

      if (existingItem) {
        // If already active, increase quantity. If inactive, reactivate with requested quantity.
        const newQuantity = existingItem.is_active
          ? existingItem.quantity + params.quantity
          : params.quantity;

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            price_at_add: params.currentPrice,
            is_active: true,
            updatedAt: new Date(),
            updated_by: params.adminOrUserId,
          },
        });
      } else {
        // Create new item
        await tx.cartItem.create({
          data: {
            uuid: crypto.randomUUID(),
            cartId: cart.id,
            productId: params.productId,
            variantId: params.variantId,
            variantUnitPriceId: params.variantUnitPriceId ?? null,
            quantity: params.quantity,
            price_at_add: params.currentPrice,
            is_active: true,
            created_by: params.adminOrUserId,
            updated_by: params.adminOrUserId,
          },
        });
      }

      // 3. Update cart last_activity_at
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          last_activity_at: new Date(),
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      // 4. Return updated cart with all active items
      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: cartInclude,
      });
    });
  },

  async findCartItem(params: { userId: bigint; identifier: string }) {
    const cart = await db.cart.findFirst({
      where: {
        userId: params.userId,
        status: "active",
        is_active: true,
      },
    });

    if (!cart) return null;

    return db.cartItem.findFirst({
      where: {
        cartId: cart.id,
        is_active: true,
        OR: [
          { uuid: params.identifier },
          { variant_unit_price: { uuid: params.identifier } },
          { variant_unit_price: { variant: { uuid: params.identifier } } },
        ],
      },
      include: cartItemInclude,
    });
  },

  async updateItemQuantity(params: {
    userId: bigint;
    variantUnitPriceUuid: string;
    quantity: number;
    currentPrice?: number;
    adminOrUserId?: bigint;
  }) {
    return db.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: {
          userId: params.userId,
          status: "active",
          is_active: true,
        },
      });

      if (!cart) return null;

      const item = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          is_active: true,
          OR: [
            { uuid: params.variantUnitPriceUuid },
            { variant_unit_price: { uuid: params.variantUnitPriceUuid } },
            { variant_unit_price: { variant: { uuid: params.variantUnitPriceUuid } } },
          ],
        },
        include: {
          variant_unit_price: true,
        },
      });

      if (!item) return null;

      const price =
        params.currentPrice ??
        (item.variant_unit_price
          ? Number(item.variant_unit_price.base_price)
          : Number(item.price_at_add));

      await tx.cartItem.update({
        where: { id: item.id },
        data: {
          quantity: params.quantity,
          price_at_add: price,
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          last_activity_at: new Date(),
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: cartInclude,
      });
    });
  },

  async removeCartItem(params: {
    userId: bigint;
    variantUnitPriceUuid: string;
    adminOrUserId?: bigint;
  }) {
    return db.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: {
          userId: params.userId,
          status: "active",
          is_active: true,
        },
      });

      if (!cart) return null;

      const item = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          is_active: true,
          OR: [
            { uuid: params.variantUnitPriceUuid },
            { variant_unit_price: { uuid: params.variantUnitPriceUuid } },
            { variant_unit_price: { variant: { uuid: params.variantUnitPriceUuid } } },
          ],
        },
      });

      if (!item) return null;

      await tx.cartItem.update({
        where: { id: item.id },
        data: {
          is_active: false,
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          last_activity_at: new Date(),
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: cartInclude,
      });
    });
  },

  async clearCart(params: {
    userId: bigint;
    adminOrUserId?: bigint;
  }) {
    return db.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: {
          userId: params.userId,
          status: "active",
          is_active: true,
        },
      });

      if (!cart) return true;

      await tx.cartItem.updateMany({
        where: {
          cartId: cart.id,
          is_active: true,
        },
        data: {
          is_active: false,
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          last_activity_at: new Date(),
          updatedAt: new Date(),
          updated_by: params.adminOrUserId,
        },
      });

      return true;
    });
  },

  async getCartItemCount(
    userId: bigint
  ): Promise<{ count: number; totalQuantity: number }> {
    const cart = await db.cart.findFirst({
      where: {
        userId,
        status: "active",
        is_active: true,
      },
      select: { id: true },
    });

    if (!cart) return { count: 0, totalQuantity: 0 };

    const result = await db.cartItem.aggregate({
      where: {
        cartId: cart.id,
        is_active: true,
        variant_unit_price: {
          isActive: true,
          deleted_at: null,
          variant: {
            isActive: true,
            deleted_at: null,
          },
        },
        product: {
          isActive: true,
          deleted_at: null,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
    });

    return {
      count: result._count.id ?? 0,
      totalQuantity: result._sum.quantity ?? 0,
    };
  },

  async applyCouponToCart(cartId: bigint, couponId: bigint) {
    return db.cart.update({
      where: { id: cartId },
      data: { coupon_id: couponId, updatedAt: new Date() },
      include: cartInclude,
    });
  },

  async removeCouponFromCart(cartId: bigint) {
    return db.cart.update({
      where: { id: cartId },
      data: { coupon_id: null, updatedAt: new Date() },
      include: cartInclude,
    });
  },
};
