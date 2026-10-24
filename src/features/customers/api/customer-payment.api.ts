import { apiClient } from "@/lib/api/api-client";
import type {
  CreateRazorpayOrderInput,
  VerifyRazorpayPaymentInput,
  RazorpayOrderResponse,
} from "@/features/payment/validations/payment.schema";

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  orderNumber: string;
  orderId: string;
}

export const customerPaymentApi = {
  /**
   * Create Razorpay order for active cart or pending customer order
   */
  async createRazorpayOrder(
    payload: CreateRazorpayOrderInput
  ): Promise<RazorpayOrderResponse> {
    const response = await apiClient.post<RazorpayOrderResponse>(
      "/api/customer/payment/create-order",
      payload
    );
    if (!response.data) {
      throw new Error(response.message || "Failed to create Razorpay order");
    }
    return response.data;
  },

  /**
   * Verify Razorpay payment signature after customer completes payment in in-built modal
   */
  async verifyPayment(
    payload: VerifyRazorpayPaymentInput
  ): Promise<VerifyPaymentResult> {
    const response = await apiClient.post<VerifyPaymentResult>(
      "/api/customer/payment/verify",
      payload
    );
    if (!response.data) {
      throw new Error(response.message || "Failed to verify payment");
    }
    return response.data;
  },
};


