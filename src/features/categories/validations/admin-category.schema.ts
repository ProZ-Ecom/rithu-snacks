import { z } from "zod";

export const createAdminCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Category name is required")
      .max(150, "Category name cannot exceed 150 characters"),
    slug: z
      .string()
      .trim()
      .min(1, "Category code is required")
      .max(170, "Category code cannot exceed 170 characters")
      .regex(
        /^[A-Za-z0-9_]+$/,
        "Category code can only contain letters, numbers, and underscores"
      ),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    icon: z
      .string()
      .trim()
      .max(500, "Icon path cannot exceed 500 characters")
      .optional()
      .nullable(),
    sortOrder: z
      .number()
      .int("Sort order must be an integer")
      .min(0, "Sort order cannot be negative")
      .max(100, "Sort order cannot exceed 100")
      .default(0)
      .optional(),
  })
  .strict();

export type CreateAdminCategoryInput = z.infer<
  typeof createAdminCategorySchema
>;

export const updateAdminCategorySchema = createAdminCategorySchema
  .partial()
  .strict();

export type UpdateAdminCategoryInput = z.infer<
  typeof updateAdminCategorySchema
>;

export const adminCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10).optional(),
  limit: z.coerce.number().int().min(1).max(100000).optional(),
  search: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type AdminCategoriesQueryInput = z.infer<
  typeof adminCategoriesQuerySchema
>;

export const adminCategoryListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1).optional(),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(10)
      .optional(),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .optional(),
    search: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type AdminCategoryListInput = z.infer<typeof adminCategoryListSchema>;

export const bulkDeleteAdminCategoriesSchema = z
  .object({
    ids: z.array(z.union([z.string(), z.number()])).optional(),
    uuids: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      (Array.isArray(data.ids) && data.ids.length > 0) ||
      (Array.isArray(data.uuids) && data.uuids.length > 0),
    {
      message: "At least one category ID or UUID is required",
    }
  );

export type BulkDeleteAdminCategoriesInput = {
  ids?: (string | number)[];
  uuids?: string[];
};


