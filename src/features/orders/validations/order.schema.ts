import { z } from "zod";

export const ORDER_STATUS_ENUM = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export const PAYMENT_STATUS_ENUM = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partial_refund",
] as const;

export const customerCreateOrderSchema = z
  .object({
    shippingAddressId: z.string().uuid("Invalid shippingAddressId UUID format"),
    billingAddressId: z.string().uuid("Invalid billingAddressId UUID format").optional(),
    deliveryMethod: z.string().optional().default("standard"),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
    paymentMethod: z.enum(["CARD", "COD", "UPI"]).default("CARD").optional(),
    paymentDetails: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export type CustomerCreateOrderInput = z.infer<typeof customerCreateOrderSchema>;

export const customerOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .optional(),
    search: z.string().trim().optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    statuses: z.array(z.string()).optional(),
    paymentStatus: z.union([z.string(), z.array(z.string())]).optional(),
    paymentStatuses: z.array(z.string()).optional(),
    filters: z.record(z.string(), z.any()).optional(),
    sortBy: z.string().default("createdAt"),
    sortOrder: z.string().default("desc"),
  })
  .passthrough();

export type CustomerOrdersQueryInput = z.infer<typeof customerOrdersQuerySchema>;

export const customerOrdersListSchema = z
  .object({
    page: z.coerce.number().int().min(1, "page must be at least 1").default(1).optional(),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20)
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .optional(),
    search: z.string().trim().optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    statuses: z.array(z.string()).optional(),
    paymentStatus: z.union([z.string(), z.array(z.string())]).optional(),
    paymentStatuses: z.array(z.string()).optional(),
    filters: z.record(z.string(), z.any()).optional(),
    sortBy: z.string().default("createdAt").optional(),
    sortOrder: z.string().default("desc").optional(),
    shippingAddressId: z.string().optional(),
    billingAddressId: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export type CustomerOrdersListInput = z.infer<typeof customerOrdersListSchema>;


export const adminOrdersListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .optional(),
    search: z.string().trim().optional(),
    customerId: z.string().uuid("Invalid customerId UUID format").optional(),
    status: z.enum(ORDER_STATUS_ENUM).optional(),
    paymentStatus: z.enum(PAYMENT_STATUS_ENUM).optional(),
    sortBy: z
      .enum([
        "orderNumber",
        "createdAt",
        "updatedAt",
        "placedAt",
        "totalAmount",
        "orderStatus",
        "paymentStatus",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminOrdersListInput = z.infer<typeof adminOrdersListSchema>;

export const cancelOrderSchema = z
  .object({
    note: z.string().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type CancelOrderSchemaInput = CancelOrderInput;

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUS_ENUM),
    note: z.string().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type UpdateOrderStatusSchemaInput = z.infer<typeof updateOrderStatusSchema>;

export const returnOrderSchema = z
  .object({
    note: z.string().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type ReturnOrderInput = z.infer<typeof returnOrderSchema>;

export const orderStatusTransitionSchema = z
  .object({
    note: z
      .string()
      .trim()
      .min(1, "Note cannot be empty")
      .max(255, "Note cannot exceed 255 characters")
      .optional(),
  })
  .strict();

export type OrderStatusTransitionInput = z.infer<
  typeof orderStatusTransitionSchema
>;

export const getOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    search: z.string().max(255).optional(),
    status: z.string().optional(),
  })
  .passthrough();

export type GetOrdersQueryInput = z.infer<typeof getOrdersQuerySchema>;

export const placeOrderSchema = z
  .object({
    addressId: z.union([z.number(), z.string()]).optional(),
    shippingAddressId: z.string().optional(),
    deliveryMethod: z.string().optional().default("STANDARD"),
    couponCode: z.string().trim().max(50).optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().max(500).optional(),
    paymentDetails: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export type PlaceOrderSchemaInput = z.infer<typeof placeOrderSchema>;

export const checkoutSummarySchema = z
  .object({
    deliveryMethod: z.string().optional().default("STANDARD"),
    couponCode: z.string().trim().max(50).optional(),
  })
  .passthrough();

export type CheckoutSummarySchemaInput = z.infer<typeof checkoutSummarySchema>;

export const shipOrderCourierSchema = z
  .object({
    deliveryPartnerId: z.union([z.string(), z.number()]),
    trackingNumber: z.string().trim().min(3, "Tracking / AWB number is required").max(100),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type ShipOrderCourierInput = z.infer<typeof shipOrderCourierSchema>;

