import { z } from "zod";

export const createAdminGstRateSchema = z
  .object({
    name: z
      .string({ message: "GST rate name is required" })
      .trim()
      .min(1, "GST rate name is required")
      .max(100, "GST rate name cannot exceed 100 characters"),
    cgstPercent: z.coerce
      .number({ message: "CGST percentage is required" })
      .min(0, "CGST percentage cannot be negative")
      .max(100, "CGST percentage cannot exceed 100"),
    sgstPercent: z.coerce
      .number({ message: "SGST percentage is required" })
      .min(0, "SGST percentage cannot be negative")
      .max(100, "SGST percentage cannot exceed 100"),
    igstPercent: z.coerce
      .number({ message: "IGST percentage is required" })
      .min(0, "IGST percentage cannot be negative")
      .max(100, "IGST percentage cannot exceed 100"),
  })
  .strict();

export type CreateAdminGstRateInput = z.infer<typeof createAdminGstRateSchema>;

export const updateAdminGstRateSchema = createAdminGstRateSchema
  .partial()
  .strict();

export type UpdateAdminGstRateInput = z.infer<typeof updateAdminGstRateSchema>;

export const adminGstRatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10).optional(),
  search: z.string().trim().optional(),
});

export type AdminGstRatesQueryInput = z.infer<typeof adminGstRatesQuerySchema>;
