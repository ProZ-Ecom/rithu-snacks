import { z } from "zod";
import { vegTypeEnum } from "@/features/products/validations/admin-product.schema";

export { vegTypeEnum };

export const createAdminVariantSchema = z
  .object({
    variantName: z
      .string({ message: "Variant name is required" })
      .trim()
      .min(1, "Variant name cannot be empty")
      .max(100, "Variant name cannot exceed 100 characters"),
    slug: z
      .string({ message: "Slug is required" })
      .trim()
      .min(1, "Slug cannot be empty")
      .max(255, "Slug cannot exceed 255 characters"),
    shortDescription: z
      .string()
      .trim()
      .max(500, "Short description cannot exceed 500 characters")
      .optional()
      .nullable(),
    description: z
      .string()
      .trim()
      .optional()
      .nullable(),
    ingredients: z
      .string()
      .trim()
      .optional()
      .nullable(),
    isReadyToMix: z.boolean().optional().default(false),
    cookingRecipe: z
      .string()
      .trim()
      .optional()
      .nullable(),
    shelfLife: z
      .string()
      .trim()
      .max(100, "Best before cannot exceed 100 characters")
      .optional()
      .nullable(),
    vegType: vegTypeEnum.optional(),
    isFeatured: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(false),
    outOfStock: z.boolean().optional().default(false),
  })
  .strict();

export type CreateAdminVariantInput = z.infer<typeof createAdminVariantSchema>;

export const updateAdminVariantSchema = z
  .object({
    variantName: z
      .string()
      .trim()
      .min(1, "Variant name cannot be empty")
      .max(100, "Variant name cannot exceed 100 characters")
      .optional(),
    slug: z
      .string()
      .trim()
      .min(1, "Slug cannot be empty")
      .max(255, "Slug cannot exceed 255 characters")
      .optional(),
    shortDescription: z
      .string()
      .trim()
      .max(500, "Short description cannot exceed 500 characters")
      .optional()
      .nullable(),
    description: z
      .string()
      .trim()
      .optional()
      .nullable(),
    ingredients: z
      .string()
      .trim()
      .optional()
      .nullable(),
    isReadyToMix: z.boolean().optional(),
    cookingRecipe: z
      .string()
      .trim()
      .optional()
      .nullable(),
    shelfLife: z
      .string()
      .trim()
      .max(100, "Best before cannot exceed 100 characters")
      .optional()
      .nullable(),
    vegType: vegTypeEnum.optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    outOfStock: z.boolean().optional(),
  })
  .strict();

export type UpdateAdminVariantInput = z.infer<typeof updateAdminVariantSchema>;

export const bulkEditVariantItemSchema = z
  .object({
    id: z
      .string({ message: "Variant unit price id is required" })
      .trim()
      .uuid("Invalid Variant Unit Price UUID format"),
    price: z
      .number()
      .min(0, "Price cannot be negative")
      .max(99999999.99, "Price exceeds maximum allowed amount")
      .optional(),
    basePrice: z
      .number()
      .min(0, "Base price cannot be negative")
      .max(99999999.99, "Price exceeds maximum allowed amount")
      .optional(),
    stock: z
      .number()
      .int("Stock must be an integer")
      .min(0, "Stock cannot be negative")
      .max(2147483647, "Stock quantity exceeds maximum allowed limit")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const bulkEditVariantsSchema = z
  .object({
    variants: z
      .array(bulkEditVariantItemSchema)
      .min(1, "At least one variant must be provided for bulk edit"),
  })
  .strict();

export type BulkEditVariantItemInput = z.infer<typeof bulkEditVariantItemSchema>;
export type BulkEditVariantsInput = z.infer<typeof bulkEditVariantsSchema>;

export const priceHistoryChartQuerySchema = z.object({
  period: z.enum(["1m", "3m", "6m", "1y", "all"]).default("1y").optional(),
});

export type PriceHistoryChartQueryInput = z.infer<
  typeof priceHistoryChartQuerySchema
>;

export const adminVariantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100000).default(10).optional(),
  search: z.string().trim().optional(),
  productId: z.string().trim().uuid("Invalid Product UUID format").optional(),
  productUuid: z.string().trim().uuid("Invalid Product UUID format").optional(),
  isActive: z.coerce.boolean().optional(),
});

export type AdminVariantsQueryInput = z.infer<typeof adminVariantsQuerySchema>;

export const adminVariantListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    limit: z.number().int().min(1).max(100000).optional(),
    search: z.string().trim().optional(),
    productId: z.string().uuid("Invalid Product UUID format").optional(),
    productIds: z
      .array(z.string().uuid("Invalid Product UUID format"))
      .optional()
      .default([]),
    brandIds: z
      .array(z.string().uuid("Invalid Brand UUID format"))
      .optional()
      .default([]),
    categoryIds: z
      .array(z.string().uuid("Invalid Category UUID format"))
      .optional()
      .default([]),
    measurementTypes: z
      .array(z.enum(["weight", "volume", "count"]))
      .optional()
      .default([]),
    unitIds: z
      .array(z.string().uuid("Invalid Unit UUID format"))
      .optional()
      .default([]),
    isActive: z.boolean().optional(),
    outOfStock: z.boolean().optional(),
    vegType: z.enum(["veg", "nonveg", "vegan", "na"]).optional(),
    minPrice: z
      .number()
      .min(0, "minPrice must be greater than or equal to 0")
      .max(99999999.99, "Price exceeds maximum allowed amount")
      .optional(),
    maxPrice: z
      .number()
      .min(0, "maxPrice must be greater than or equal to 0")
      .max(99999999.99, "Price exceeds maximum allowed amount")
      .optional(),
    sortBy: z
      .enum([
        "variantName",
        "productName",
        "sku",
        "basePrice",
        "salePrice",
        "createdAt",
        "updatedAt",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.maxPrice >= data.minPrice,
    {
      message: "maxPrice cannot be less than minPrice",
      path: ["maxPrice"],
    }
  );

export type AdminVariantListInput = z.infer<typeof adminVariantListSchema>;

export const variantPriceHistoryQuerySchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    pageSize: z
      .number()
      .int()
      .min(1, "pageSize must be at least 1")
      .max(100000, "pageSize cannot exceed 100000")
      .default(20),
    fromDate: z
      .string()
      .trim()
      .regex(
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
        "Invalid fromDate format (expected YYYY-MM-DD)"
      )
      .optional(),
    toDate: z
      .string()
      .trim()
      .regex(
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
        "Invalid toDate format (expected YYYY-MM-DD)"
      )
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine(
    (data) => {
      if (data.fromDate && data.toDate) {
        return new Date(data.toDate) >= new Date(data.fromDate);
      }
      return true;
    },
    {
      message: "toDate cannot be earlier than fromDate",
      path: ["toDate"],
    }
  );

export type VariantPriceHistoryQueryInput = z.infer<
  typeof variantPriceHistoryQuerySchema
>;

export const bulkDeleteAdminVariantsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1, "At least one item ID is required"),
  })
  .strict();

export type BulkDeleteAdminVariantsInput = z.infer<
  typeof bulkDeleteAdminVariantsSchema
>;

