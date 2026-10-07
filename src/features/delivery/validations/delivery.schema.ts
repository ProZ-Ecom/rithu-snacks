import { z } from "zod";

/* ----------------------- Admin Delivery Schemas ----------------------- */

export const adminDeliveryOrdersListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .default(10),
    search: z.string().trim().optional(),
    orderStatus: z
      .enum([
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ])
      .optional(),
    deliveryStatus: z
      .enum([
        "pending",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
      ])
      .optional(),
    staffId: z.string().uuid("Invalid staff UUID").optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "orderNumber",
        "totalAmount",
        "orderStatus",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminDeliveryOrdersListInput = z.infer<
  typeof adminDeliveryOrdersListSchema
>;

export const adminDeliveryStaffListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .default(10),
    search: z.string().trim().optional(),
    isActive: z.boolean().optional().default(true),
    sortBy: z
      .enum(["name", "email", "phone", "createdAt", "updatedAt", "isActive"])
      .default("name"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();

export type AdminDeliveryStaffListInput = z.input<
  typeof adminDeliveryStaffListSchema
>;

export const assignDeliverySchema = z
  .object({
    orderId: z.string().uuid("Invalid order UUID"),
    staffId: z.string().uuid("Invalid staff UUID"),
    note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;

/* ----------------------- Staff Delivery Schemas ----------------------- */

export const staffDeliveryListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .default(10),
    pageSize: z.number().int().min(1).max(100000).optional(),
    search: z.string().trim().optional(),
    status: z
      .enum([
        "pending",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
      ])
      .optional(),
    assignmentStatus: z
      .enum(["pending", "accepted", "rejected", "reassigned"])
      .optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "shippedAt", "deliveredAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type StaffDeliveryListInput = z.infer<typeof staffDeliveryListSchema>;

export const deliveryUuidParamSchema = z.object({
  uuid: z.string().uuid("Invalid delivery UUID format"),
});

export type DeliveryUuidParamInput = z.infer<typeof deliveryUuidParamSchema>;

export const markDeliveredSchema = z
  .object({
    note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type MarkDeliveredInput = z.infer<typeof markDeliveredSchema>;

export const markFailedSchema = z
  .object({
    reason: z.string().trim().min(1, "Reason is required").max(255).optional(),
    note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
  })
  .strict();

export type MarkFailedInput = z.infer<typeof markFailedSchema>;

export const rejectDeliverySchema = z
  .object({
    reason: z.string().trim().min(1, "Rejection reason is required").max(255),
    note: z.string().trim().max(500, "Note cannot exceed 500 characters").optional(),
  })
  .strict();

export type RejectDeliveryInput = z.infer<typeof rejectDeliverySchema>;

