import { z } from "zod";

export const getBlogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(10),
  search: z.string().optional(),
  status: z.string().optional(),
});

export type GetBlogsQueryInput = z.infer<typeof getBlogsQuerySchema>;

export const createBlogSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(1000).optional(),
  image: z.string().max(500).optional(),
  authorId: z.number().int().positive().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export type CreateBlogSchemaInput = z.infer<typeof createBlogSchema>;

export const updateBlogSchema = createBlogSchema.partial();

export type UpdateBlogSchemaInput = z.infer<typeof updateBlogSchema>;
