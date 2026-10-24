import { z } from "zod";

export const createAdminBrandSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Brand name is required")
      .max(150, "Brand name cannot exceed 150 characters"),
    slug: z
      .string()
      .trim()
      .min(1, "Brand code is required")
      .max(170, "Brand code cannot exceed 170 characters"),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
  })
  .strict();

export type CreateAdminBrandInput = z.infer<typeof createAdminBrandSchema>;

export const updateAdminBrandSchema = createAdminBrandSchema
  .partial()
  .strict();

export type UpdateAdminBrandInput = z.infer<typeof updateAdminBrandSchema>;

export const adminBrandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10).optional(),
  search: z.string().trim().optional(),
});

export type AdminBrandsQueryInput = z.infer<typeof adminBrandsQuerySchema>;
