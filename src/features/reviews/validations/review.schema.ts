import { z } from "zod";

export const createReviewSchema = z
  .object({
    variantUnitPriceId: z
      .string()
      .uuid("Invalid variant unit price UUID")
      .optional(),
    variantId: z
      .string()
      .uuid("Invalid variant UUID")
      .optional(),
    productId: z
      .string()
      .uuid("Invalid product UUID")
      .optional(),
    orderItemId: z
      .string()
      .uuid("Invalid order item UUID")
      .optional(),
    rating: z
      .number({ message: "Rating is required" })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    title: z.string().trim().max(150, "Title cannot exceed 150 characters").optional(),
    comment: z
      .string()
      .trim()
      .max(2000, "Comment cannot exceed 2000 characters")
      .optional(),
    images: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Image URL cannot be empty")
          .max(500, "Image URL too long")
      )
      .max(10, "Cannot upload more than 10 images")
      .optional()
      .default([]),
  })
  .strict()
  .refine(
    (data) => Boolean(data.orderItemId || data.variantUnitPriceId || data.variantId || data.productId),
    {
      message: "At least one target (orderItemId, variantUnitPriceId, variantId, or productId) must be provided",
      path: ["variantId"],
    }
  );

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5")
      .optional(),
    title: z.string().trim().max(150, "Title cannot exceed 150 characters").optional(),
    comment: z
      .string()
      .trim()
      .max(2000, "Comment cannot exceed 2000 characters")
      .optional(),
    images: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Image URL cannot be empty")
          .max(500, "Image URL too long")
      )
      .max(10, "Cannot upload more than 10 images")
      .optional(),
  })
  .strict();

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const customerReviewListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .default(10),
    search: z.string().trim().optional(),
    isApproved: z.boolean().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "rating"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type CustomerReviewListInput = z.infer<typeof customerReviewListSchema>;

export const adminReviewListSchema = z
  .object({
    page: z.number().int().min(1, "page must be at least 1").default(1),
    limit: z
      .number()
      .int()
      .min(1, "limit must be at least 1")
      .max(100000, "limit cannot exceed 100000")
      .default(10),
    search: z.string().trim().optional(),
    isApproved: z.boolean().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    productId: z.string().uuid("Invalid product UUID format").optional(),
    // Item-level variant: matches reviews across all of its pack sizes.
    variantId: z.string().uuid("Invalid variant UUID format").optional(),
    // Exact pack size only.
    variantUnitPriceId: z.string().uuid("Invalid variant unit price UUID format").optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "rating"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminReviewListInput = z.infer<typeof adminReviewListSchema>;

export const publicReviewQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100000).default(10),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sortBy: z.enum(["createdAt", "rating"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type PublicReviewQueryInput = z.infer<typeof publicReviewQuerySchema>;

export const moderateReviewSchema = z
  .object({
    isApproved: z.boolean(),
  })
  .strict();

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const reviewUuidParamSchema = z.object({
  uuid: z.string().uuid("Invalid review UUID format"),
});

export type ReviewUuidParamInput = z.infer<typeof reviewUuidParamSchema>;
