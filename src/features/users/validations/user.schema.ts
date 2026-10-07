import { z } from "zod";

/* ----------------------------- Query Schema ----------------------------- */

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  roleId: z.coerce.number().int().positive().optional(),
});

export type GetUsersQueryInput = z.infer<typeof getUsersQuerySchema>;

/* --------------------------- Mobile Validation -------------------------- */

const indiaPhoneSchema = z
  .string({ message: "Mobile number is required" })
  .trim()
  .transform((val) => {
    if (/^[6-9]\d{9}$/.test(val)) {
      return `+91${val}`;
    }
    return val;
  })
  .refine(
    (val) => /^\+91[6-9]\d{9}$/.test(val),
    {
      message: "Mobile number must be a valid 10-digit Indian number starting with +91 (e.g. +919876543210)",
    }
  );

/* --------------------------- Create User Schema ------------------------- */

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Full name must contain at least 3 characters")
    .max(255, "Full name must be less than 255 characters"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),

  phone: indiaPhoneSchema,

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters"),

  roleId: z
    .number()
    .int()
    .positive("Please select a valid role")
    .optional(),

  status: z.enum(["active", "inactive", "banned"]).optional(),
});

export type CreateUserSchemaInput = z.infer<typeof createUserSchema>;

/* --------------------------- Update User Schema ------------------------- */

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial();

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ResetPasswordSchemaInput = z.infer<typeof resetPasswordSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters")
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .optional(),
    email: z
      .string({ message: "Email is required" })
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .transform((val) => val.toLowerCase()),
    mobileNumber: indiaPhoneSchema.optional(),
    phone: indiaPhoneSchema.optional(),
    password: z
      .string({ message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().optional(),
    emailVerificationToken: z
      .string({ message: "Email verification token is required" })
      .trim()
      .min(1, "Email verification token is required"),
  })
  .refine(
    (data) => Boolean(data.fullName || data.name),
    {
      message: "Full name is required",
      path: ["fullName"],
    }
  )
  .refine(
    (data) => Boolean(data.mobileNumber || data.phone),
    {
      message: "Mobile number is required",
      path: ["mobileNumber"],
    }
  )
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateUserSchemaInput = z.infer<typeof updateUserSchema>;
