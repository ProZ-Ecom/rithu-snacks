import { z } from "zod";

const parseDateString = z
  .string()
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val));

export const bannerMediaTypeSchema = z.enum(["image", "video"]);

export const createBannerSchema = z
  .object({
    bannerPositionId: z
      .string({ message: "Banner position ID is required" })
      .uuid("Invalid banner position UUID"),
    title: z
      .string({ message: "Title is required" })
      .trim()
      .min(1, "Title is required")
      .max(150, "Title cannot exceed 150 characters"),
    mediaType: bannerMediaTypeSchema.default("image"),
    // Optional at the field level: video banners (e.g. home reels) have no
    // image at all. The refinement below keeps it required for image banners.
    imageUrl: z
      .string()
      .trim()
      .max(500, "Image URL cannot exceed 500 characters")
      .default(""),
    videoUrl: z
      .string()
      .trim()
      .max(500, "Video URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    thumbnailUrl: z
      .string()
      .trim()
      .max(500, "Thumbnail URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    linkUrl: z
      .string()
      .trim()
      .max(500, "Link URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    sortOrder: z
      .number()
      .int("Sort order must be an integer")
      .min(0, "Sort order cannot be negative")
      .max(100, "Sort order cannot exceed 100")
      .default(0),
    isActive: z.boolean().default(true),
    startsAt: parseDateString.nullable().optional(),
    endsAt: parseDateString.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.startsAt.getTime() <= data.endsAt.getTime();
      }
      return true;
    },
    {
      message: "startsAt must be before or equal to endsAt",
      path: ["endsAt"],
    }
  )
  .refine((data) => data.mediaType !== "video" || Boolean(data.videoUrl), {
    message: "Video URL is required when media type is video",
    path: ["videoUrl"],
  })
  .refine((data) => data.mediaType !== "image" || Boolean(data.imageUrl), {
    message: "Image URL is required when media type is image",
    path: ["imageUrl"],
  });

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
/** Shape sent over the wire, before dates are parsed into `Date`. */
export type CreateBannerPayload = z.input<typeof createBannerSchema>;

export const updateBannerSchema = z
  .object({
    bannerPositionId: z
      .string()
      .uuid("Invalid banner position UUID")
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(150, "Title cannot exceed 150 characters")
      .optional(),
    mediaType: bannerMediaTypeSchema.optional(),
    imageUrl: z
      .string()
      .trim()
      .max(500, "Image URL cannot exceed 500 characters")
      .optional(),
    videoUrl: z
      .string()
      .trim()
      .max(500, "Video URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    thumbnailUrl: z
      .string()
      .trim()
      .max(500, "Thumbnail URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    linkUrl: z
      .string()
      .trim()
      .max(500, "Link URL cannot exceed 500 characters")
      .nullable()
      .optional(),
    sortOrder: z
      .number()
      .int("Sort order must be an integer")
      .min(0, "Sort order cannot be negative")
      .max(100, "Sort order cannot exceed 100")
      .optional(),
    isActive: z.boolean().optional(),
    startsAt: parseDateString.nullable().optional(),
    endsAt: parseDateString.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.startsAt.getTime() <= data.endsAt.getTime();
      }
      return true;
    },
    {
      message: "startsAt must be before or equal to endsAt",
      path: ["endsAt"],
    }
  )
  .refine(
    (data) =>
      data.mediaType !== "image" ||
      data.imageUrl === undefined ||
      Boolean(data.imageUrl),
    {
      message: "Image URL is required when media type is image",
      path: ["imageUrl"],
    }
  );

export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
/** Shape sent over the wire, before dates are parsed into `Date`. */
export type UpdateBannerPayload = z.input<typeof updateBannerSchema>;

export const bannerListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100000).default(10),
    search: z.string().trim().optional(),
    bannerPositionId: z.string().uuid("Invalid banner position UUID").optional(),
    positionSlug: z.string().trim().optional(),
    isActive: z
      .preprocess((val) => {
        if (val === "true" || val === true) return true;
        if (val === "false" || val === false) return false;
        return undefined;
      }, z.boolean().optional())
      .optional(),
    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "title",
        "sortOrder",
        "startsAt",
        "endsAt",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export interface BannerListQueryInput {
  page?: number;
  limit?: number;
  search?: string;
  bannerPositionId?: string;
  positionSlug?: string;
  isActive?: boolean;
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "title"
    | "sortOrder"
    | "startsAt"
    | "endsAt";
  sortOrder?: "asc" | "desc";
}

export const bannerUuidParamSchema = z
  .object({
    uuid: z.string().uuid("Invalid banner UUID"),
  })
  .strict();

export const customerBannerQuerySchema = z
  .object({
    position: z.string().trim().min(1).optional(),
    page: z.string().trim().optional(),
  })
  .strict();

export type CustomerBannerQueryInput = z.infer<
  typeof customerBannerQuerySchema
>;
