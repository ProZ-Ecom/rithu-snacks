import { z } from "zod";

export const createAdminHsnCodeSchema = z
  .object({
    code: z
      .string({ message: "HSN code is required" })
      .trim()
      .min(1, "HSN code is required")
      .max(20, "HSN code cannot exceed 20 characters"),
    description: z
      .string()
      .trim()
      .max(255, "Description cannot exceed 255 characters")
      .optional()
      .nullable(),
    gstRateId: z
      .string({ message: "GST rate is required" })
      .trim()
      .min(1, "GST rate is required")
      .uuid("Invalid GST Rate UUID format"),
  })
  .strict();

export type CreateAdminHsnCodeInput = z.infer<typeof createAdminHsnCodeSchema>;

export const updateAdminHsnCodeSchema = createAdminHsnCodeSchema
  .partial()
  .strict();

export type UpdateAdminHsnCodeInput = z.infer<typeof updateAdminHsnCodeSchema>;

export const adminHsnCodesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10).optional(),
  search: z.string().trim().optional(),
});

export type AdminHsnCodesQueryInput = z.infer<typeof adminHsnCodesQuerySchema>;
