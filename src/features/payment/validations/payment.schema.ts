import { z } from "zod";

export const createRazorpayOrderSchema = z.object({
  orderId: z.string().optional(),
  shippingAddressId: z.string().optional(),
  deliveryMethod: z.string().optional().default("standard"),
});

export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;

export const verifyRazorpayPaymentSchema = z.object({
  orderId: z.string().optional(),
  shippingAddressId: z.string().optional(),
  billingAddressId: z.string().optional(),
  deliveryMethod: z.string().optional().default("standard"),
  notes: z.string().optional(),
  razorpay_order_id: z.string().min(1, "Razorpay Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay Payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay Signature is required"),
});

export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;


export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderNumber: string;
  internalOrderId: string;
}
