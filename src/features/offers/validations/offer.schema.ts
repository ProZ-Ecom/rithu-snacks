import { z } from "zod";

export const OFFER_LEVELS = ["product", "item"] as const;
export const OFFER_TYPES = ["percentage", "flat", "special_price", "bxgy"] as const;
export const OFFER_STATUSES = ["active", "inactive", "scheduled", "expired"] as const;

const uuid = z.string().trim().min(1);

/** `""` from an untouched form field means "not provided", not "set to empty". */
const optionalText = (max: number, label = "Field") =>
  z
    .string({ message: `${label} must be text` })
    .trim()
    .max(max, `${label} cannot exceed ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalInt = (opts: { min?: number; max?: number; label: string }) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${opts.label} must be a valid number`,
        });
        return z.NEVER;
      }
      if (!Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${opts.label} must be a whole number`,
        });
        return z.NEVER;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${opts.label} must be at least ${opts.min}`,
        });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${opts.label} cannot exceed ${opts.max.toLocaleString("en-IN")}`,
        });
        return z.NEVER;
      }
      return n;
    });

const optionalDecimal = (opts: { min?: number; max?: number; label: string }) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid amount within limits",
        });
        return z.NEVER;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${opts.label} cannot be negative`,
        });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid amount within limits",
        });
        return z.NEVER;
      }
      return n;
    });

const dateString = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date");

// ---------------------------------------------------------------------------
// List / filter query
// ---------------------------------------------------------------------------

export const getOffersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100000).default(10),
  search: z.string().trim().optional(),
  level: z.enum(OFFER_LEVELS).optional(),
  type: z.enum(OFFER_TYPES).optional(),
  status: z.enum(OFFER_STATUSES).optional(),
  categoryId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z
    .enum(["name", "priority", "startsAt", "endsAt", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetOffersQueryInput = z.infer<typeof getOffersQuerySchema>;

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

const offerBaseSchema = z.object({
  name: z
    .string({ message: "Offer name is required" })
    .trim()
    .min(1, "Offer name is required")
    .max(150, "Offer name cannot exceed 150 characters"),
  code: optionalText(50, "Offer code"),
  level: z.enum(OFFER_LEVELS, { message: "Select an offer level" }),
  type: z.enum(OFFER_TYPES, { message: "Select an offer type" }),
  value: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid discount value",
        });
        return z.NEVER;
      }
      if (n < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Discount value cannot be negative",
        });
        return z.NEVER;
      }
      if (n > 99999999.99) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid amount within limits",
        });
        return z.NEVER;
      }
      return n;
    }),
  buyQuantity: optionalInt({ min: 1, max: 99999, label: "Buy quantity" }),
  getQuantity: optionalInt({ min: 1, max: 99999, label: "Get quantity" }),
  minQuantity: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return 1;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum quantity must be a valid number",
        });
        return z.NEVER;
      }
      if (!Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum quantity must be a whole number",
        });
        return z.NEVER;
      }
      if (n < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum quantity must be at least 1",
        });
        return z.NEVER;
      }
      if (n > 99999) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum quantity cannot exceed 99,999",
        });
        return z.NEVER;
      }
      return n;
    }),
  maxQuantity: optionalInt({ min: 1, max: 99999, label: "Maximum quantity" }),
  minCartValue: optionalDecimal({ min: 0, max: 99999999.99, label: "Minimum cart value" }),
  maxDiscountAmount: optionalDecimal({ min: 0, max: 99999999.99, label: "Maximum discount" }),
  priority: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Priority must be a valid number",
        });
        return z.NEVER;
      }
      if (!Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Priority must be a whole number",
        });
        return z.NEVER;
      }
      if (n < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Priority cannot be negative",
        });
        return z.NEVER;
      }
      if (n > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Priority cannot exceed 1000",
        });
        return z.NEVER;
      }
      return n;
    }),
  terms: optionalText(5000, "Terms & Conditions"),
  startDate: z.string().trim().optional(),
  startTime: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  endTime: z.string().trim().optional(),
  startsAt: z.string().trim().optional(),
  endsAt: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  productIds: z.array(uuid).default([]),
  itemIds: z.array(uuid).default([]),
});

type OfferBaseShape = z.infer<typeof offerBaseSchema>;

/**
 * Field-level rules can't see each other, so every rule that spans two fields
 * lives here. Shared by create and update so a PUT can't sidestep them.
 */
function applyOfferRules<T extends Partial<OfferBaseShape>>(
  data: T,
  ctx: z.RefinementCtx
) {
  const {
    level,
    type,
    value,
    startDate,
    startTime,
    endDate,
    endTime,
    startsAt,
    endsAt,
    minQuantity,
    maxQuantity,
    buyQuantity,
    getQuantity,
    minCartValue,
    maxDiscountAmount,
    productIds,
    itemIds,
  } = data;

  // Date & Time window
  const effectiveStartsAt =
    startDate
      ? `${startDate}T${startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : "00:00:00"}`
      : startsAt;

  const effectiveEndsAt =
    endDate
      ? `${endDate}T${endTime ? (endTime.length === 5 ? `${endTime}:59` : endTime) : "23:59:59"}`
      : endsAt;

  if (!effectiveStartsAt) {
    ctx.addIssue({
      code: "custom",
      path: [startDate !== undefined ? "startDate" : "startsAt"],
      message: "Start date is required",
    });
  }

  if (!effectiveEndsAt) {
    ctx.addIssue({
      code: "custom",
      path: [endDate !== undefined ? "endDate" : "endsAt"],
      message: "End date is required",
    });
  }

  if (effectiveStartsAt && effectiveEndsAt) {
    const start = new Date(effectiveStartsAt);
    const end = new Date(effectiveEndsAt);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: [startDate !== undefined ? "startDate" : "startsAt"],
        message: "Enter a valid start date & time",
      });
    }
    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: [endDate !== undefined ? "endDate" : "endsAt"],
        message: "Enter a valid end date & time",
      });
    }
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end.getTime() < start.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: [endDate !== undefined ? "endDate" : "endsAt"],
        message: "End date/time cannot be before start date/time",
      });
    }
  }

  // Offer type rules
  if (type === "percentage") {
    if (value === undefined || value === null || value <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Discount Percentage must be greater than 0",
      });
    } else if (value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Discount percentage cannot exceed 100%",
      });
    }
  }

  if (type === "flat") {
    if (value === undefined || value === null || value <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Discount amount must be greater than 0",
      });
    } else if (value > 99999999.99) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Please enter a valid amount within limits",
      });
    }
  }

  if (type === "special_price") {
    if (value === undefined || value === null || value <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Special offer price must be greater than 0",
      });
    } else if (value > 99999999.99) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Please enter a valid amount within limits",
      });
    }
  }

  if (type === "bxgy") {
    if (!buyQuantity || buyQuantity < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["buyQuantity"],
        message: "Buy quantity is required and must be at least 1",
      });
    } else if (buyQuantity > 99999) {
      ctx.addIssue({
        code: "custom",
        path: ["buyQuantity"],
        message: "Buy quantity cannot exceed 99,999",
      });
    }

    if (!getQuantity || getQuantity < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["getQuantity"],
        message: "Get quantity is required and must be at least 1",
      });
    } else if (getQuantity > 99999) {
      ctx.addIssue({
        code: "custom",
        path: ["getQuantity"],
        message: "Get quantity cannot exceed 99,999",
      });
    }

    if (buyQuantity && getQuantity && getQuantity > buyQuantity) {
      ctx.addIssue({
        code: "custom",
        path: ["getQuantity"],
        message: "Get quantity cannot exceed buy quantity",
      });
    }
  }

  // A cap on a special price is meaningless - the price is already absolute.
  if (type === "special_price" && maxDiscountAmount != null && maxDiscountAmount > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["maxDiscountAmount"],
      message: "Maximum discount does not apply to a special offer price",
    });
  }

  // Quantity rules
  if (maxQuantity != null) {
    if (maxQuantity < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["maxQuantity"],
        message: "Maximum quantity must be at least 1",
      });
    } else if (maxQuantity > 99999) {
      ctx.addIssue({
        code: "custom",
        path: ["maxQuantity"],
        message: "Maximum quantity cannot exceed 99,999",
      });
    } else if (minQuantity != null && maxQuantity < minQuantity) {
      ctx.addIssue({
        code: "custom",
        path: ["maxQuantity"],
        message: "Maximum quantity cannot be less than the minimum quantity",
      });
    }
  }

  if (type === "bxgy" && buyQuantity && minQuantity != null && minQuantity > buyQuantity) {
    ctx.addIssue({
      code: "custom",
      path: ["minQuantity"],
      message: "Minimum quantity cannot exceed the buy quantity",
    });
  }

  if (minCartValue != null) {
    if (minCartValue < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["minCartValue"],
        message: "Minimum cart value cannot be negative",
      });
    } else if (minCartValue > 99999999.99) {
      ctx.addIssue({
        code: "custom",
        path: ["minCartValue"],
        message: "Please enter a valid amount within limits",
      });
    }
  }

  if (maxDiscountAmount != null) {
    if (maxDiscountAmount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["maxDiscountAmount"],
        message: "Maximum discount cannot be negative",
      });
    } else if (maxDiscountAmount > 99999999.99) {
      ctx.addIssue({
        code: "custom",
        path: ["maxDiscountAmount"],
        message: "Please enter a valid amount within limits",
      });
    }
  }

  if (
    minCartValue != null &&
    maxDiscountAmount != null &&
    minCartValue > 0 &&
    maxDiscountAmount > minCartValue
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["maxDiscountAmount"],
      message: "Maximum discount cannot be greater than the minimum cart value",
    });
  }

  // Target rules - only the selection matching the level is considered, so a
  // stale selection left behind by switching tabs can't leak into the offer.
  if (level === "product" && productIds !== undefined && productIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["productIds"],
      message: "Select at least one product for a product-wise offer",
    });
  }

  if (level === "item" && itemIds !== undefined && itemIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["itemIds"],
      message: "Select at least one item/variant for an item-wise offer",
    });
  }
}

export const createOfferSchema = offerBaseSchema
  .transform((data) => {
    const startsAt =
      (data.startDate
        ? `${data.startDate}T${data.startTime ? (data.startTime.length === 5 ? `${data.startTime}:00` : data.startTime) : "00:00:00"}`
        : data.startsAt) || "";
    const endsAt =
      (data.endDate
        ? `${data.endDate}T${data.endTime ? (data.endTime.length === 5 ? `${data.endTime}:59` : data.endTime) : "23:59:59"}`
        : data.endsAt) || "";
    return {
      ...data,
      startsAt,
      endsAt,
    };
  })
  .superRefine(applyOfferRules);
export type CreateOfferSchemaInput = z.input<typeof createOfferSchema>;
export type CreateOfferSchemaOutput = z.output<typeof createOfferSchema>;

export const updateOfferSchema = offerBaseSchema
  .partial()
  .transform((data) => {
    let startsAt = data.startsAt;
    if (data.startDate) {
      startsAt = `${data.startDate}T${data.startTime ? (data.startTime.length === 5 ? `${data.startTime}:00` : data.startTime) : "00:00:00"}`;
    }
    let endsAt = data.endsAt;
    if (data.endDate) {
      endsAt = `${data.endDate}T${data.endTime ? (data.endTime.length === 5 ? `${data.endTime}:59` : data.endTime) : "23:59:59"}`;
    }
    return {
      ...data,
      ...(startsAt !== undefined ? { startsAt } : {}),
      ...(endsAt !== undefined ? { endsAt } : {}),
    };
  })
  .superRefine(applyOfferRules);
export type UpdateOfferSchemaInput = z.input<typeof updateOfferSchema>;
export type UpdateOfferSchemaOutput = z.output<typeof updateOfferSchema>;

export const offerStatusSchema = z.object({
  isActive: z.boolean(),
});
export type OfferStatusInput = z.infer<typeof offerStatusSchema>;

// ---------------------------------------------------------------------------
// Offer target pickers (dependent dropdowns)
// ---------------------------------------------------------------------------

export const offerTargetQuerySchema = z.object({
  categoryId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type OfferTargetQueryInput = z.infer<typeof offerTargetQuerySchema>;
