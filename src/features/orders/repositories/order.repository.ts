import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";
import { formatVariantMeasurement } from "@/features/variants/utils/measurement.util";
import type {
  OrderDetailResponse,
  OrderListItemResponse,
  OrderItemResponse,
  OrderAddressResponse,
  OrderStatusHistoryResponse,
  OrderListResponse,
  AdminOrdersCountResponse,
} from "../types";
import type {
  CustomerOrdersQueryInput,
  CustomerOrdersListInput,
  AdminOrdersListInput,
} from "../validations/order.schema";

export const orderAddressInclude = Prisma.validator<Prisma.OrderAddressInclude>()({});

export const orderItemInclude = Prisma.validator<Prisma.OrderItemInclude>()({
  product: {
    select: {
      id: true,
      uuid: true,
      name: true,
      images: {
        where: { is_active: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  },
  variant: {
    select: {
      id: true,
      uuid: true,
      variant_name: true,
      product_variant_images: {
        where: { is_active: true },
        orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
        take: 1,
      },
    },
  },
  variant_unit_price: {
    select: {
      id: true,
      uuid: true,
      sku: true,
      unit_value: true,
      // Live sku/unit fallback for display; the authoritative values for an
      // already-placed order are the *_snapshot fields on OrderItem itself.
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

export const orderDetailInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
    select: {
      id: true,
      uuid: true,
      cust_id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  address: {
    where: { is_active: true },
  },
  items: {
    where: { is_active: true },
    include: orderItemInclude,
  },
  order_status_history: {
    where: { is_active: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  },
  shipments: {
    where: { is_active: true },
    orderBy: { id: "desc" },
    take: 1,
    include: {
      delivery_staff: {
        select: {
          id: true,
          uuid: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      delivery_partners: {
        select: {
          id: true,
          name: true,
          code: true,
          contact_number: true,
        },
      },
    },
  },
  coupons: {
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
    },
  },
  coupon_usage: {
    where: { is_active: true },
    select: {
      id: true,
      discount_amount: true,
    },
  },
});

export function formatOrderAddress(
  address?: Prisma.OrderAddressGetPayload<typeof orderAddressInclude> | null
): OrderAddressResponse | null {
  if (!address) return null;
  const addressType = address.type === "billing" ? "billing" : "shipping";
  return {
    id: address.uuid || String(address.id),
    type: address.type,
    addressType,
    fullName: address.full_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2 ?? null,
    landmark: address.landmark ?? null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    latitude: address.latitude ? Number(address.latitude) : null,
    longitude: address.longitude ? Number(address.longitude) : null,
  };
}

export function formatOrderItem(
  item: Prisma.OrderItemGetPayload<{ include: typeof orderItemInclude }>
): OrderItemResponse {
  const unitPrice = item.variant_unit_price;
  const variant = item.variant || unitPrice?.variant;
  const measurement = formatVariantMeasurement(
    unitPrice?.product_units,
    unitPrice?.unit_value ?? 0
  );

  const primaryImage =
    variant?.product_variant_images?.[0]?.image_url ||
    item.product?.images?.[0]?.image_url ||
    null;

  return {
    id: item.uuid || String(item.id),
    productId: item.product?.uuid || String(item.productId),
    variantId: variant?.uuid || String(variant?.id ?? ""),
    variantUnitPriceId: unitPrice?.uuid || String(item.variantUnitPriceId),
    productName: item.product_name_snapshot,
    variantName: item.variant_snapshot,
    sku: item.sku_snapshot,
    measurement,
    primaryImage,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    discountAmount: Number(item.discount_amount ?? 0),
    taxAmount: Number(item.tax_amount),
    totalPrice: Number(item.total_price),
  };
}

export function formatOrderStatusHistory(
  history: Prisma.order_status_historyGetPayload<{}>
): OrderStatusHistoryResponse {
  return {
    id: String(history.id),
    status: history.status,
    note: history.note ?? null,
    createdAt: history.created_at,
  };
}

export function formatOrderDelivery(
  shipments?: Array<{
    id: bigint;
    uuid: string | null;
    assignment_status: string | null;
    tracking_number?: string | null;
    delivery_partner_id?: bigint | null;
    status?: string | null;
    shipped_at?: Date | null;
    delivery_notes?: string | null;
    created_at: Date;
    accepted_at: Date | null;
    delivered_at: Date | null;
    delivery_staff?: {
      id: bigint;
      uuid: string | null;
      name: string;
      email?: string | null;
      phone: string | null;
    } | null;
    delivery_partners?: {
      id: bigint;
      name: string;
      code: string;
      contact_number?: string | null;
    } | null;
  }> | null
) {
  if (!shipments || shipments.length === 0) {
    return {
      isAssigned: false,
      assignmentStatus: null,
      deliveryId: null,
      staff: null,
      assignedAt: null,
      trackingNumber: null,
      deliveryPartnerId: null,
      deliveryPartner: null,
      status: null,
      shippedAt: null,
      deliveryNotes: null,
    };
  }

  const latest = shipments[0];
  const staff = latest.delivery_staff;
  const partner = latest.delivery_partners;

  const isAssigned = Boolean(staff) || Boolean(partner) || latest.assignment_status !== null;

  return {
    isAssigned,
    assignmentStatus: latest.assignment_status || (staff ? "pending" : null),
    deliveryId: latest.uuid || String(latest.id),
    staff: staff
      ? {
          id: staff.uuid || String(staff.id),
          name: staff.name,
          email: staff.email ?? null,
          phone: staff.phone ?? null,
        }
      : null,
    assignedAt: latest.created_at ? latest.created_at.toISOString() : null,
    trackingNumber: latest.tracking_number ?? null,
    deliveryPartnerId: latest.delivery_partner_id ? String(latest.delivery_partner_id) : null,
    deliveryPartner: partner
      ? {
          id: String(partner.id),
          name: partner.name,
          code: partner.code,
          contactNumber: partner.contact_number ?? null,
        }
      : null,
    status: latest.status ?? null,
    shippedAt: latest.shipped_at ? latest.shipped_at.toISOString() : null,
    deliveryNotes: latest.delivery_notes ?? null,
  };
}

export function formatOrderDetail(
  order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>
): OrderDetailResponse {
  const customer = {
    id: order.user?.uuid || String(order.userId),
    customerId: order.user?.cust_id ?? null,
    name: order.user?.name || "",
    email: order.user?.email ?? null,
    phone: order.user?.phone ?? null,
  };

  const items = (order.items || []).map(formatOrderItem);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const shippingRaw = (order.address || []).find((a) => a.type === "shipping");
  const billingRaw = (order.address || []).find((a) => a.type === "billing");

  const shippingAddress = formatOrderAddress(shippingRaw);
  const billingAddress = formatOrderAddress(billingRaw || shippingRaw);

  const statusHistory = (order.order_status_history || []).map(
    formatOrderStatusHistory
  );

  return {
    id: order.uuid || String(order.id),
    orderNumber: order.orderNumber,
    customer,
    status: order.order_status,
    paymentStatus: order.payment_status,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    shippingCharge: Number(order.shipping_charge),
    totalAmount: Number(order.totalAmount),
    totalItems,
    delivery: formatOrderDelivery((order as any).shipments),
    couponCode: (order as any).coupons?.code ?? null,
    couponDiscount: (order as any).coupon_usage?.[0]?.discount_amount
      ? Number((order as any).coupon_usage[0].discount_amount)
      : null,
    notes: order.notes ?? null,
    placedAt: order.placed_at ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items,
    shippingAddress,
    billingAddress,
    statusHistory,
  };
}

export function formatOrderListItem(
  order: Prisma.OrderGetPayload<{
    include: {
      user: {
        select: {
          id: true;
          uuid: true;
          cust_id: true;
          name: true;
          email: true;
          phone: true;
        };
      };
      items: {
        where: { is_active: true };
        select: { quantity: true };
      };
    };
  }>
): OrderListItemResponse {
  const customer = {
    id: order.user?.uuid || String(order.userId),
    customerId: order.user?.cust_id ?? null,
    name: order.user?.name || "",
    email: order.user?.email ?? null,
    phone: order.user?.phone ?? null,
  };

  const totalItems = (order.items || []).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    id: order.uuid || String(order.id),
    orderNumber: order.orderNumber,
    customer,
    status: order.order_status,
    paymentStatus: order.payment_status,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    shippingCharge: Number(order.shipping_charge),
    totalAmount: Number(order.totalAmount),
    totalItems,
    delivery: formatOrderDelivery((order as any).shipments),
    notes: order.notes ?? null,
    placedAt: order.placed_at ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function generateUniqueOrderNumber(
  prismaClient: Prisma.TransactionClient | typeof db = db
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  for (let i = 0; i < 10; i++) {
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randomHex}`;

    const existing = await prismaClient.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    if (!existing) {
      return orderNumber;
    }
  }

  // Fallback with timestamp
  return `ORD-${dateStr}-${Date.now().toString().slice(-6)}`;
}

export const orderRepository = {
  async createCustomerOrderTransaction(params: {
    userId: bigint;
    cartId: bigint;
    couponId?: bigint | null;
    couponDiscount?: number;
    subtotal: number;
    discountAmount?: number;
    shippingCharge?: number;
    totalAmount: number;
    notes?: string;
    orderStatus?: "pending" | "confirmed";
    paymentStatus?: "pending" | "paid";
    paymentMethod?: string;
    shippingAddress: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string | null;
      landmark?: string | null;
      city: string;
      state: string;
      pincode?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    };
    billingAddress: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string | null;
      landmark?: string | null;
      city: string;
      state: string;
      pincode?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    };
    items: Array<{
      productId: bigint;
      variantId: bigint;
      variantUnitPriceId: bigint;
      productName: string;
      variantName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxAmount: number;
      totalPrice: number;
    }>;
  }): Promise<OrderDetailResponse> {
    return db.$transaction(async (tx) => {
      const orderNumber = await generateUniqueOrderNumber(tx);
      const now = new Date();

      // 1. Create Order
      const createdOrder = await tx.order.create({
        data: {
          uuid: crypto.randomUUID(),
          orderNumber,
          userId: params.userId,
          cart_id: params.cartId,
          couponId: params.couponId ?? null,
          order_status: (params.orderStatus ?? "pending") as any,
          payment_status: (params.paymentStatus ?? "pending") as any,
          subtotal: params.subtotal,
          discountAmount: params.discountAmount ?? 0,
          taxAmount: 0,
          shipping_charge: params.shippingCharge ?? 0,
          totalAmount: params.totalAmount,
          notes: params.notes ?? null,
          placed_at: now,
          is_active: true,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });

      // 1b. Record coupon usage if a valid coupon was applied
      if (params.couponId && (params.couponDiscount ?? 0) > 0) {
        await tx.coupon_usage.create({
          data: {
            uuid: crypto.randomUUID(),
            coupon_id: params.couponId,
            user_id: params.userId,
            order_id: createdOrder.id,
            discount_amount: params.couponDiscount ?? 0,
            used_at: now,
            is_active: true,
            created_by: params.userId,
            updated_by: params.userId,
          },
        });
      }

      // 2. Create Addresses (Shipping & Billing)
      await tx.orderAddress.createMany({
        data: [
          {
            uuid: crypto.randomUUID(),
            orderId: createdOrder.id,
            type: "shipping",
            full_name: params.shippingAddress.fullName,
            phone: params.shippingAddress.phone,
            address_line1: params.shippingAddress.addressLine1,
            address_line2: params.shippingAddress.addressLine2 ?? null,
            landmark: params.shippingAddress.landmark ?? null,
            city: params.shippingAddress.city,
            state: params.shippingAddress.state,
            pincode: params.shippingAddress.pincode || "",
            country: params.shippingAddress.country || "India",
            latitude: params.shippingAddress.latitude ?? null,
            longitude: params.shippingAddress.longitude ?? null,
            is_active: true,
            created_by: params.userId,
            updated_by: params.userId,
          },
          {
            uuid: crypto.randomUUID(),
            orderId: createdOrder.id,
            type: "billing",
            full_name: params.billingAddress.fullName,
            phone: params.billingAddress.phone,
            address_line1: params.billingAddress.addressLine1,
            address_line2: params.billingAddress.addressLine2 ?? null,
            landmark: params.billingAddress.landmark ?? null,
            city: params.billingAddress.city,
            state: params.billingAddress.state,
            pincode: params.billingAddress.pincode || "",
            country: params.billingAddress.country || "India",
            latitude: params.billingAddress.latitude ?? null,
            longitude: params.billingAddress.longitude ?? null,
            is_active: true,
            created_by: params.userId,
            updated_by: params.userId,
          },
        ],
      });

      // 3. Create Order Items
      await tx.orderItem.createMany({
        data: params.items.map((item) => ({
          uuid: crypto.randomUUID(),
          orderId: createdOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          variantUnitPriceId: item.variantUnitPriceId,
          product_name_snapshot: item.productName,
          variant_snapshot: item.variantName,
          sku_snapshot: item.sku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount,
          tax_amount: item.taxAmount,
          total_price: item.totalPrice,
          is_active: true,
          created_by: params.userId,
          updated_by: params.userId,
        })),
      });

      // 4. Create Status History
      await tx.order_status_history.create({
        data: {
          order_id: createdOrder.id,
          status: (params.orderStatus ?? "pending") as any,
          note:
            params.notes ||
            (params.paymentStatus === "paid"
              ? `Order confirmed with payment via ${params.paymentMethod ?? "CARD"}`
              : "Order placed by customer"),
          changed_by: params.userId,
          is_active: true,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });

      // 5. Convert Cart & Deactivate Items & clear coupon_id
      await tx.cart.update({
        where: { id: params.cartId },
        data: {
          coupon_id: null,
          status: "converted",
          last_activity_at: now,
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      await tx.cartItem.updateMany({
        where: {
          cartId: params.cartId,
          is_active: true,
        },
        data: {
          is_active: false,
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      // 6. Fetch created full order
      const fullOrder = await tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: orderDetailInclude,
      });

      return formatOrderDetail(fullOrder);
    });
  },

  async findCustomerOrders(
    userId: bigint,
    params: CustomerOrdersListInput | CustomerOrdersQueryInput = {}
  ): Promise<OrderListResponse<OrderDetailResponse>> {
    const page = Number(params.page ?? 1) || 1;
    const limit =
      Number((params as any).limit ?? params.pageSize ?? 20) || 20;

    const where: Prisma.OrderWhereInput = {
      userId,
      is_active: true,
    };

    // 1. Resolve requested status(es) flexibly (single string, array, or nested filters)
    const rawStatuses: string[] = [];
    const collectStatus = (val: unknown) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((v) => typeof v === "string" && rawStatuses.push(v));
      } else if (typeof val === "string") {
        rawStatuses.push(val);
      }
    };

    collectStatus(params.status);
    collectStatus((params as any).statuses);
    collectStatus((params as any).filters?.status);
    collectStatus((params as any).filters?.statuses);

    const validStatuses: any[] = [];
    for (const raw of rawStatuses) {
      const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
      if (
        normalized === "order_placed" ||
        normalized === "orderplaced" ||
        normalized === "placed"
      ) {
        validStatuses.push("pending", "confirmed");
      } else if (
        normalized === "out_of_delivery" ||
        normalized === "out_for_delivery" ||
        normalized === "outfordelivery" ||
        normalized === "outdelivery"
      ) {
        validStatuses.push("out_for_delivery");
      } else if (
        [
          "pending",
          "confirmed",
          "processing",
          "packed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ].includes(normalized)
      ) {
        validStatuses.push(normalized);
      }
    }

    if (validStatuses.length === 1) {
      where.order_status = validStatuses[0];
    } else if (validStatuses.length > 1) {
      where.order_status = { in: Array.from(new Set(validStatuses)) };
    }

    // 2. Resolve requested payment status(es)
    const rawPaymentStatuses: string[] = [];
    const collectPaymentStatus = (val: unknown) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((v) => typeof v === "string" && rawPaymentStatuses.push(v));
      } else if (typeof val === "string") {
        rawPaymentStatuses.push(val);
      }
    };

    collectPaymentStatus((params as any).paymentStatus);
    collectPaymentStatus((params as any).paymentStatuses);
    collectPaymentStatus((params as any).filters?.paymentStatus);
    collectPaymentStatus((params as any).filters?.paymentStatuses);

    const validPayments = rawPaymentStatuses
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is any =>
        ["pending", "paid", "failed", "refunded", "partial_refund"].includes(s)
      );

    if (validPayments.length === 1) {
      where.payment_status = validPayments[0];
    } else if (validPayments.length > 1) {
      where.payment_status = { in: Array.from(new Set(validPayments)) };
    }

    if (params.search) {
      where.orderNumber = { contains: params.search };
    }

    const sortOrder =
      String(params.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: sortOrder };

    if (params.sortBy === "orderNumber") {
      orderBy = { orderNumber: sortOrder };
    } else if (params.sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else if (params.sortBy === "updatedAt") {
      orderBy = { updatedAt: sortOrder };
    } else if (params.sortBy === "placedAt") {
      orderBy = { placed_at: sortOrder };
    } else if (params.sortBy === "totalAmount") {
      orderBy = { totalAmount: sortOrder };
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: orderDetailInclude,
      }),
      db.order.count({ where }),
    ]);

    return {
      data: orders.map(formatOrderDetail),
      meta: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findCustomerOrderByUuid(
    userId: bigint,
    uuid: string
  ): Promise<OrderDetailResponse | null> {
    if (!uuid || uuid === "undefined" || uuid === "null") {
      return null;
    }

    const isNumeric = /^\d+$/.test(uuid);
    const order = await db.order.findFirst({
      where: {
        userId,
        is_active: true,
        OR: [
          { uuid },
          { orderNumber: uuid },
          ...(isNumeric ? [{ id: BigInt(uuid) }] : []),
        ],
      },
      include: orderDetailInclude,
    });

    return order ? formatOrderDetail(order) : null;
  },

  buildAdminOrdersWhere(params: AdminOrdersListInput): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      is_active: true,
    };

    if (params.customerId) {
      where.user = { uuid: params.customerId };
    }

    if (params.status) {
      where.order_status = params.status;
    }

    if (params.paymentStatus) {
      where.payment_status = params.paymentStatus;
    }

    if (params.search) {
      const s = params.search;
      where.OR = [
        { orderNumber: { contains: s } },
        { user: { name: { contains: s } } },
        { user: { email: { contains: s } } },
        { user: { phone: { contains: s } } },
        { user: { cust_id: { contains: s } } },
      ];
    }

    return where;
  },

  async countAdminOrders(
    params: AdminOrdersListInput
  ): Promise<AdminOrdersCountResponse> {
    const baseWhere: Prisma.OrderWhereInput = {
      is_active: true,
    };

    if (params.customerId) {
      baseWhere.user = { uuid: params.customerId };
    }

    if (params.paymentStatus) {
      baseWhere.payment_status = params.paymentStatus;
    }

    if (params.search) {
      const s = params.search;
      baseWhere.OR = [
        { orderNumber: { contains: s } },
        { user: { name: { contains: s } } },
        { user: { email: { contains: s } } },
        { user: { phone: { contains: s } } },
        { user: { cust_id: { contains: s } } },
      ];
    }

    const whereToUse = params.status
      ? { ...baseWhere, order_status: params.status }
      : baseWhere;

    const grouped = await db.order.groupBy({
      by: ["order_status"],
      where: whereToUse,
      _count: {
        id: true,
      },
    });

    const statusCounts: AdminOrdersCountResponse = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      shipped: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      total: 0,
    };

    for (const g of grouped) {
      const status = g.order_status as keyof AdminOrdersCountResponse;
      if (status && status in statusCounts && status !== "total") {
        statusCounts[status] = g._count.id;
        statusCounts.total += g._count.id;
      }
    }

    return statusCounts;
  },

  async findAdminOrders(
    params: AdminOrdersListInput
  ): Promise<OrderListResponse<OrderListItemResponse>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where = this.buildAdminOrdersWhere(params);

    const sortOrder = params.sortOrder ?? "desc";
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: sortOrder };

    if (params.sortBy === "orderNumber") {
      orderBy = { orderNumber: sortOrder };
    } else if (params.sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else if (params.sortBy === "updatedAt") {
      orderBy = { updatedAt: sortOrder };
    } else if (params.sortBy === "placedAt") {
      orderBy = { placed_at: sortOrder };
    } else if (params.sortBy === "totalAmount") {
      orderBy = { totalAmount: sortOrder };
    } else if (params.sortBy === "orderStatus") {
      orderBy = { order_status: sortOrder };
    } else if (params.sortBy === "paymentStatus") {
      orderBy = { payment_status: sortOrder };
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              uuid: true,
              cust_id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: {
            where: { is_active: true },
            select: { quantity: true },
          },
          shipments: {
            where: { is_active: true },
            orderBy: { id: "desc" },
            take: 1,
            include: {
              delivery_staff: {
                select: {
                  id: true,
                  uuid: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              delivery_partners: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  contact_number: true,
                },
              },
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return {
      data: orders.map(formatOrderListItem),
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async findAdminOrderByUuid(uuid: string): Promise<OrderDetailResponse | null> {
    const order = await db.order.findFirst({
      where: {
        uuid,
        is_active: true,
      },
      include: orderDetailInclude,
    });

    return order ? formatOrderDetail(order) : null;
  },

  async cancelOrderTransaction(params: {
    orderId: bigint;
    note?: string;
    changedBy: bigint;
  }): Promise<OrderDetailResponse> {
    return db.$transaction(async (tx) => {
      const now = new Date();

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          order_status: "cancelled",
          updatedAt: now,
          updated_by: params.changedBy,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: params.orderId,
          status: "cancelled",
          note: params.note || "Order cancelled",
          changed_by: params.changedBy,
          is_active: true,
          created_by: params.changedBy,
          updated_by: params.changedBy,
        },
      });

      // Rollback coupon usage if applied, so customer gets their quota back
      await tx.coupon_usage.updateMany({
        where: { order_id: params.orderId, is_active: true },
        data: { is_active: false, updated_at: now },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: params.orderId },
        include: orderDetailInclude,
      });

      return formatOrderDetail(updated);
    });
  },

  async returnOrderTransaction(params: {
    orderId: bigint;
    note?: string;
    changedBy: bigint;
  }): Promise<OrderDetailResponse> {
    return db.$transaction(async (tx) => {
      const now = new Date();

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          order_status: "returned",
          updatedAt: now,
          updated_by: params.changedBy,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: params.orderId,
          status: "returned",
          note: params.note || "Order returned",
          changed_by: params.changedBy,
          is_active: true,
          created_by: params.changedBy,
          updated_by: params.changedBy,
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: params.orderId },
        include: orderDetailInclude,
      });

      return formatOrderDetail(updated);
    });
  },

  async updateOrderStatusWithHistory(params: {
    orderId: bigint;
    status: string;
    note?: string;
    changedBy: bigint;
  }): Promise<OrderDetailResponse> {
    return db.$transaction(async (tx) => {
      const now = new Date();

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          order_status: params.status as any,
          updatedAt: now,
          updated_by: params.changedBy,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: params.orderId,
          status: params.status,
          note: params.note || null,
          changed_by: params.changedBy,
          is_active: true,
          created_by: params.changedBy,
          updated_by: params.changedBy,
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: params.orderId },
        include: orderDetailInclude,
      });

      return formatOrderDetail(updated);
    });
  },
};
