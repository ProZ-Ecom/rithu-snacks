import { z } from "zod";

export const createStaffSchema = z
  .object({
    name: z
      .string({ message: "Name is required" })
      .trim()
      .min(1, "Name is required")
      .max(150, "Name cannot exceed 150 characters"),
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Invalid email format")
      .max(150, "Email cannot exceed 150 characters")
      .transform((val) => val.toLowerCase()),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional()
      .nullable(),
    password: z
      .string({ message: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password cannot exceed 100 characters"),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(150, "Name cannot exceed 150 characters")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .max(150, "Email cannot exceed 150 characters")
      .transform((val) => val.toLowerCase())
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional()
      .nullable(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password cannot exceed 100 characters")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const adminStaffListSchema = z
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
    isActive: z.boolean().optional(),
    sortBy: z
      .enum(["name", "email", "phone", "createdAt", "updatedAt", "isActive"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminStaffListInput = z.infer<typeof adminStaffListSchema>;

export const staffUuidParamSchema = z.object({
  uuid: z.string().uuid("Invalid staff UUID format"),
});

export type StaffUuidParamInput = z.infer<typeof staffUuidParamSchema>;

/* ------------------------- Staff Self-Profile Schemas ------------------------ */

export const updateStaffProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(150, "Name cannot exceed 150 characters")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .max(150, "Email cannot exceed 150 characters")
      .transform((val) => val.toLowerCase())
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional()
      .nullable(),
    avatar: z
      .string()
      .trim()
      .max(500, "Avatar URL cannot exceed 500 characters")
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;

export const changeStaffPasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: "Current password is required" })
      .min(1, "Current password is required")
      .max(100, "Current password cannot exceed 100 characters"),
    newPassword: z
      .string({ message: "New password is required" })
      .min(6, "New password must be at least 6 characters")
      .max(100, "New password cannot exceed 100 characters"),
    confirmPassword: z
      .string({ message: "Confirm password is required" })
      .min(6, "Confirm password must be at least 6 characters")
      .max(100, "Confirm password cannot exceed 100 characters"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password do not match",
    path: ["confirmPassword"],
  });

export type ChangeStaffPasswordInput = z.infer<typeof changeStaffPasswordSchema>;

