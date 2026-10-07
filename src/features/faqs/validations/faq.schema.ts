import { z } from "zod";
import { FAQ_ICON_KEYS } from "../constants/faq-icons";

export const faqStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** `faq.question` is a VARCHAR(255); `faq.answer` is a TEXT column. */
const questionSchema = z
  .string({ message: "Question is required" })
  .trim()
  .min(1, "Question is required")
  .max(255, "Question cannot exceed 255 characters");

const answerSchema = z
  .string({ message: "Answer is required" })
  .trim()
  .min(1, "Answer is required")
  .max(5000, "Answer cannot exceed 5000 characters");

const categorySchema = z
  .preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .trim()
      .max(100, "Category cannot exceed 100 characters")
      .nullable()
      .optional()
  );

const iconSchema = z
  .preprocess(
    (val) => (val === "" ? null : val),
    z
      .enum(FAQ_ICON_KEYS, { message: "Please choose a valid icon" })
      .nullable()
      .optional()
  );

const displayOrderSchema = z.coerce
  .number()
  .int("Display order must be a whole number")
  .min(0, "Display order cannot be negative")
  .max(9999, "Display order cannot exceed 9999");

export const createFaqSchema = z
  .object({
    question: questionSchema,
    answer: answerSchema,
    category: categorySchema,
    icon: iconSchema,
    displayOrder: displayOrderSchema.default(0),
    status: faqStatusSchema.default("ACTIVE"),
  })
  .strict();

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type CreateFaqPayload = z.input<typeof createFaqSchema>;

export const updateFaqSchema = z
  .object({
    question: questionSchema.optional(),
    answer: answerSchema.optional(),
    category: categorySchema,
    icon: iconSchema,
    displayOrder: displayOrderSchema.optional(),
    status: faqStatusSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type UpdateFaqPayload = z.input<typeof updateFaqSchema>;

export const faqListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100000).optional(),
    pageSize: z.coerce.number().int().min(1).max(100000).optional(),
    search: z.string().trim().max(255).optional(),
    category: z.string().trim().max(100).optional(),
    status: z
      .preprocess(
        (val) => (val === "" || val === undefined ? undefined : val),
        faqStatusSchema.optional()
      )
      .optional(),
    sortBy: z
      .enum(["displayOrder", "question", "category", "createdAt", "updatedAt"])
      .default("displayOrder"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict()
  .transform((data) => ({
    ...data,
    limit: data.limit ?? data.pageSize ?? 10,
  }));

export type FaqListQueryInput = z.infer<typeof faqListQuerySchema>;

export const publicFaqQuerySchema = z
  .object({
    category: z.string().trim().max(100).optional(),
    search: z.string().trim().max(255).optional(),
  })
  .strict();

export type PublicFaqQueryInput = z.infer<typeof publicFaqQuerySchema>;

/** Route params arrive as strings, so the numeric id is coerced here. */
export const faqIdParamSchema = z
  .object({
    id: z.coerce
      .number()
      .int("Invalid FAQ id")
      .positive("Invalid FAQ id")
      .max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const updateFaqStatusSchema = z
  .object({
    status: faqStatusSchema,
  })
  .strict();

export type UpdateFaqStatusInput = z.infer<typeof updateFaqStatusSchema>;

export const updateFaqOrderSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.coerce.number().int().positive("Invalid FAQ id"),
            displayOrder: displayOrderSchema,
          })
          .strict()
      )
      .min(1, "At least one FAQ is required")
      .max(200, "Cannot reorder more than 200 FAQs at once")
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        { message: "Duplicate FAQ ids are not allowed" }
      ),
  })
  .strict();

export type UpdateFaqOrderInput = z.infer<typeof updateFaqOrderSchema>;
