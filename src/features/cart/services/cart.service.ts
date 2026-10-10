import { db } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/api-error";
import { userRepository } from "@/features/users/repositories/user.repository";
import { formatVariantMeasurement } from "@/features/variants/utils/measurement.util";
import { offerService } from "@/features/offers/services/offer.service";
import { couponService } from "@/features/coupons/services/coupon.service";
import { cartRepository } from "../repositories/cart.repository";
import type {
  AddCartItemInput,
  UpdateCartItemInput,
} from "../validations/cart.schema";
import type {
  CartResponse,
  CartItemResponse,
  CartCountResponse,
} from "../types/cart.types";

type DefaultUnitPrice = {
  base_price: unknown;
} | null | undefined;

/**
 * The catalog price of one unit. Offers are applied on top of this by
 * `formatCartResponse`, via the shared offer engine - never here, because a
 * minimum-cart-value offer can only be judged once every line is known.
 */
function calculateVariantPrice(unitPrice: DefaultUnitPrice): number {
  const basePrice =
    unitPrice?.base_price !== null && unitPrice?.base_price !== undefined
      ? Number(unitPrice.base_price)
      : 0;

  return basePrice;
}

const EMPTY_CART: CartResponse = {
  id: null,
  items: [],
  subtotal: 0,
  originalSubtotal: 0,
  totalDiscount: 0,
  totalSavings: 0,
  total: 0,
  totalItems: 0,
};

async function formatCartResponse(
  cart: Awaited<ReturnType<typeof cartRepository.findActiveCartByUserId>>
): Promise<CartResponse> {
  if (!cart) return { ...EMPTY_CART };

  type CartRow = (typeof cart.items)[number];
  type PricedCartRow = CartRow & {
    variant_unit_price: NonNullable<CartRow["variant_unit_price"]>;
    product: NonNullable<CartRow["product"]>;
  };

  const rows = cart.items.filter(
    (item): item is PricedCartRow =>
      Boolean(item.variant_unit_price) && Boolean(item.product) && item.is_active
  );

  if (rows.length === 0) {
    return { ...EMPTY_CART, id: cart.uuid || String(cart.id) };
  }

  // One engine call for the whole cart, so offers gated on the cart value see
  // the real subtotal and every line is priced consistently.
  const pricing = await offerService.priceCartItems(
    rows.map((item) => ({
      itemId: item.variant_unit_price.uuid,
      quantity: item.quantity,
      unitPrice: calculateVariantPrice(item.variant_unit_price),
    }))
  );

  let totalItems = 0;

  const items: CartItemResponse[] = rows.map((item, index) => {
    const unitPrice = item.variant_unit_price;
    const variant = unitPrice.variant;
    const product = item.product;
    const line = pricing.lines[index];

    const basePrice = calculateVariantPrice(unitPrice);
    const priceAtAdd = Number(item.price_at_add);
    totalItems += item.quantity;

    const primaryImg =
      variant.product_variant_images?.[0]?.image_url ||
      product.images?.[0]?.image_url ||
      null;

    const measurement = formatVariantMeasurement(
      unitPrice.product_units,
      unitPrice.unit_value ?? 0
    );

    const variantName =
      variant.variant_name ||
      `${unitPrice.unit_value ?? ""} ${unitPrice.product_units?.code || ""}`.trim();

    return {
      id: item.uuid || String(item.id),
      productId: product.uuid || String(product.id),
      variantId: variant.uuid || String(variant.id),
      variantUnitPriceId: unitPrice.uuid || String(unitPrice.id),
      productName: product.name,
      variantName,
      measurement,
      primaryImage: primaryImg,
      quantity: item.quantity,
      price: line.finalPrice,
      priceAtAdd,
      basePrice,
      currentPrice: line.finalPrice,
      // Compared against the catalog price, so an offer starting or ending
      // does not read as "the price of this product changed".
      priceChanged: priceAtAdd !== basePrice,
      discountAmount: line.discountAmount,
      offer: line.offer,
      freeQuantity: line.freeQuantity,
      originalItemTotal: line.originalLineTotal,
      itemTotal: line.finalLineTotal,
    };
  });

  let couponSummary: CartResponse["coupon"] = null;
  let couponDiscount = 0;

  if (cart.coupon_id && cart.userId) {
    const validated = await couponService.validateCouponById(
      cart.coupon_id,
      cart.userId,
      pricing.total
    );

    if (validated) {
      couponDiscount = validated.discountAmount;
      couponSummary = {
        id: validated.couponId,
        code: validated.code,
        type: validated.type,
        value: validated.value,
        discountAmount: validated.discountAmount,
        minOrderAmount: validated.minOrderAmount,
        maxDiscount: validated.maxDiscount,
      };
    } else {
      // If no longer valid (e.g. cart subtotal dropped below min requirement),
      // cleanly detach the coupon in DB
      await cartRepository.removeCouponFromCart(cart.id);
    }
  }

  const finalTotal = Math.max(0, pricing.total - couponDiscount);

  return {
    id: cart.uuid || String(cart.id),
    items,
    subtotal: pricing.total,
    originalSubtotal: pricing.subtotal,
    totalDiscount: pricing.totalDiscount,
    totalSavings: pricing.totalSavings + couponDiscount,
    total: finalTotal,
    totalItems,
    coupon: couponSummary,
    couponDiscount,
  };
}

async function resolveInternalUserId(sessionUserId: string): Promise<bigint> {
  const user = await userRepository.findById(sessionUserId);
  if (!user) {
    throw ApiError.unauthorized("Please login to access your cart");
  }
  if (!user.isActive || user.is_active === false) {
    throw ApiError.forbidden("Your account is inactive or blocked. Please contact support.");
  }
  return BigInt(user.internalId);
}

export const cartService = {
  async getCart(sessionUserId: string): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);
    const cart = await cartRepository.findActiveCartByUserId(userId);
    return formatCartResponse(cart);
  },

  async addItem(
    sessionUserId: string,
    input: AddCartItemInput
  ): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);

    // 1. Validate requested variant unit price (exact pack size) & parents
    let unitPrice = input.variantUnitPriceId
      ? await db.variantUnitPrice.findFirst({
          where: {
            uuid: input.variantUnitPriceId,
            deleted_at: null,
          },
          include: {
            variant: { include: { product: true } },
          },
        })
      : null;

    // If not found by unit price UUID or variantId was passed directly, try finding by variant UUID
    if (!unitPrice) {
      const variantUuid = input.variantId || input.variantUnitPriceId;
      if (variantUuid) {
        // Try finding default unit price of variant
        unitPrice = await db.variantUnitPrice.findFirst({
          where: {
            variant: { uuid: variantUuid },
            deleted_at: null,
          },
          orderBy: [{ is_default: "desc" }, { createdAt: "asc" }],
          include: {
            variant: { include: { product: true } },
          },
        });
      }
    }

    if (!unitPrice) {
      throw ApiError.notFound("Product pack size not found");
    }

    const variant = unitPrice.variant;

    if (
      !unitPrice.isActive ||
      !variant ||
      !variant.isActive ||
      variant.deleted_at !== null ||
      !variant.product ||
      !variant.product.isActive ||
      variant.product.deleted_at !== null
    ) {
      throw ApiError.badRequest("Product variant is unavailable");
    }

    const currentPrice = calculateVariantPrice(unitPrice);

    // 2. Add to cart in transaction
    const updatedCart = await cartRepository.addItemToCart({
      userId,
      productId: variant.productId,
      variantId: variant.id,
      variantUnitPriceId: unitPrice.id,
      quantity: input.quantity,
      currentPrice,
      adminOrUserId: userId,
    });

    return formatCartResponse(updatedCart);
  },

  async getCartItem(
    sessionUserId: string,
    identifier: string
  ): Promise<CartItemResponse> {
    const userId = await resolveInternalUserId(sessionUserId);

    const item = await cartRepository.findCartItem({
      userId,
      identifier,
    });

    if (!item) {
      throw ApiError.notFound("Cart item not found");
    }

    const unitPrice = item.variant_unit_price;
    const variant = unitPrice?.variant;
    const product = item.product;

    const basePrice = unitPrice
      ? calculateVariantPrice(unitPrice)
      : Number(item.price_at_add);
    const priceAtAdd = Number(item.price_at_add);
    const priceChanged = priceAtAdd !== basePrice;

    // Priced on its own, so the cart-value gate is judged against this line
    // alone; the full-cart view re-prices it against the real subtotal.
    const [line] = unitPrice
      ? await offerService.priceItems(
          [
            {
              itemId: unitPrice.uuid,
              quantity: item.quantity,
              unitPrice: basePrice,
            },
          ],
          { trustUnitPrice: true }
        )
      : [];

    const primaryImg =
      variant?.product_variant_images?.[0]?.image_url ||
      product?.images?.[0]?.image_url ||
      null;

    const measurement = formatVariantMeasurement(
      unitPrice?.product_units,
      unitPrice?.unit_value ?? 0
    );

    const variantName =
      variant?.variant_name ||
      `${unitPrice?.unit_value ?? ""} ${unitPrice?.product_units?.code || ""}`.trim();

    return {
      id: item.uuid || String(item.id),
      productId: product?.uuid || String(item.productId),
      variantId: variant?.uuid || "",
      variantUnitPriceId: unitPrice?.uuid || String(item.variantUnitPriceId),
      productName: product?.name || "",
      variantName,
      measurement,
      primaryImage: primaryImg,
      quantity: item.quantity,
      price: line?.finalPrice ?? basePrice,
      priceAtAdd,
      basePrice,
      currentPrice: line?.finalPrice ?? basePrice,
      priceChanged,
      discountAmount: line?.discountAmount ?? 0,
      offer: line?.offer ?? null,
      freeQuantity: line?.freeQuantity ?? 0,
      originalItemTotal: line?.originalLineTotal ?? basePrice * item.quantity,
      itemTotal: line?.finalLineTotal ?? basePrice * item.quantity,
    };
  },

  async updateItemQuantity(
    sessionUserId: string,
    identifier: string,
    input: UpdateCartItemInput
  ): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);

    const existingItem = await cartRepository.findCartItem({
      userId,
      identifier,
    });

    if (!existingItem) {
      throw ApiError.notFound("Cart item not found");
    }

    const unitPrice = existingItem.variant_unit_price;
    const variant = unitPrice?.variant;

    if (
      !unitPrice ||
      !unitPrice.isActive ||
      unitPrice.deleted_at !== null ||
      !variant ||
      !variant.isActive ||
      variant.deleted_at !== null ||
      !existingItem.product ||
      !existingItem.product.isActive ||
      existingItem.product.deleted_at !== null
    ) {
      throw ApiError.badRequest("Product variant is unavailable");
    }

    const currentPrice = calculateVariantPrice(unitPrice);

    const updatedCart = await cartRepository.updateItemQuantity({
      userId,
      variantUnitPriceUuid: identifier,
      quantity: input.quantity,
      currentPrice,
      adminOrUserId: userId,
    });

    if (!updatedCart) {
      throw ApiError.notFound("Cart item not found");
    }

    return formatCartResponse(updatedCart);
  },

  async removeItem(
    sessionUserId: string,
    identifier: string
  ): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);

    const updatedCart = await cartRepository.removeCartItem({
      userId,
      variantUnitPriceUuid: identifier,
      adminOrUserId: userId,
    });

    if (!updatedCart) {
      throw ApiError.notFound("Cart item not found");
    }

    return formatCartResponse(updatedCart);
  },

  async clearCart(sessionUserId: string): Promise<void> {
    const userId = await resolveInternalUserId(sessionUserId);
    await cartRepository.clearCart({
      userId,
      adminOrUserId: userId,
    });
  },

  async getCartCount(sessionUserId: string): Promise<CartCountResponse> {
    const userId = await resolveInternalUserId(sessionUserId);
    return cartRepository.getCartItemCount(userId);
  },

  async applyCoupon(sessionUserId: string, code: string): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);
    const cart = await cartRepository.findActiveCartByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest("Your cart is empty. Add snacks before applying a coupon.");
    }

    const lines = cart.items
      .filter((it) => it.variant_unit_price && it.product && it.is_active)
      .map((it) => ({
        itemId: it.variant_unit_price!.uuid,
        quantity: it.quantity,
        unitPrice: calculateVariantPrice(it.variant_unit_price),
      }));

    if (lines.length === 0) {
      throw ApiError.badRequest("No available items in cart to apply coupon.");
    }

    const pricing = await offerService.priceCartItems(lines);

    const couponResult = await couponService.validateAndCalculateDiscount(
      code,
      userId,
      pricing.total
    );

    const updatedCart = await cartRepository.applyCouponToCart(
      cart.id,
      BigInt(couponResult.couponId)
    );

    return formatCartResponse(updatedCart);
  },

  async removeCoupon(sessionUserId: string): Promise<CartResponse> {
    const userId = await resolveInternalUserId(sessionUserId);
    const cart = await cartRepository.findActiveCartByUserId(userId);
    if (!cart) {
      throw ApiError.notFound("Active cart not found");
    }

    const updatedCart = await cartRepository.removeCouponFromCart(cart.id);
    return formatCartResponse(updatedCart);
  },
};
