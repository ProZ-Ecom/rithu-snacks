import { z } from "zod";

export const createContactSchema = z
  .object({
    name: z
      .string({ message: "Full Name is required" })
      .trim()
      .min(1, "Full Name is required")
      .max(150, "Full Name cannot exceed 150 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Full Name can only contain letters, spaces, hyphens, and apostrophes"
      ),
    email: z
      .string({ message: "Email is required" })
      .trim()
      .email("Invalid email address")
      .max(150, "Email cannot exceed 150 characters"),
    phone: z
      .string({ message: "Phone number is required" })
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        "Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9"
      ),
    subject: z
      .string({ message: "Subject is required" })
      .trim()
      .min(1, "Subject cannot be empty")
      .max(200, "Subject cannot exceed 200 characters"),
    message: z
      .string({ message: "Message is required" })
      .trim()
      .min(1, "Message cannot be empty"),
  })
  .strict();

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const adminContactListSchema = z
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
    status: z.enum(["new", "read", "replied"]).optional(),
    sortBy: z
      .enum(["name", "email", "subject", "status", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type AdminContactListInput = z.infer<typeof adminContactListSchema>;

export const updateContactStatusSchema = z
  .object({
    status: z.enum(["new", "read", "replied"], {
      message: "Status must be 'new', 'read', or 'replied'",
    }),
  })
  .strict();

export type UpdateContactStatusInput = z.infer<typeof updateContactStatusSchema>;

export const replyContactSchema = z
  .object({
    message: z
      .string({ message: "Reply message is required" })
      .trim()
      .min(1, "Reply message cannot be empty"),
  })
  .strict();

export type ReplyContactInput = z.infer<typeof replyContactSchema>;

export const contactUuidParamSchema = z.object({
  uuid: z.string().uuid("Invalid Contact Message UUID format"),
});

export type ContactUuidParamInput = z.infer<typeof contactUuidParamSchema>;
