import { z } from "zod";
import {
  ORDER_STATUS_ENUM,
  PAYMENT_STATUS_ENUM,
} from "@/features/orders/validations/order.schema";

export const adminCustomerListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    search: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "banned"]).optional(),
    isActive: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    isWhatsapp: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    sortBy: z
      .enum(["name", "email", "createdAt", "updatedAt", "lastLoginAt", "status"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminCustomerListInput = z.infer<typeof adminCustomerListSchema>;

export const adminCustomerOrdersSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    status: z.enum(ORDER_STATUS_ENUM).optional(),
    paymentStatus: z.enum(PAYMENT_STATUS_ENUM).optional(),
    search: z.string().trim().optional(),
    sortBy: z
      .enum(["orderNumber", "status", "totalAmount", "placedAt", "createdAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminCustomerOrdersInput = z.infer<typeof adminCustomerOrdersSchema>;

export const updateCustomerStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;

