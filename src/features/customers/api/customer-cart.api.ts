import { apiClient } from "@/lib/api/api-client";
import type {
  CartResponse,
  CartItemResponse,
  CartCountResponse,
} from "@/features/cart/types/cart.types";

const EMPTY_CART: CartResponse = {
  id: null,
  items: [],
  subtotal: 0,
  originalSubtotal: 0,
  totalDiscount: 0,
  totalSavings: 0,
  total: 0,
  totalItems: 0,
};

export interface AddCartItemPayload {
  variantId: string;
  quantity: number;
}

export const customerCartApi = {
  /**
   * Fetch customer cart
   * Postman: GET /api/customer/cart
   */
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.get<CartResponse>("/api/customer/cart");
    return response.data ?? EMPTY_CART;
  },

  /**
   * Fetch customer cart count
   * Postman: GET /api/customer/cart/count
   */
  async getCartCount(): Promise<CartCountResponse> {
    const response = await apiClient.get<CartCountResponse>(
      "/api/customer/cart/count"
    );
    return response.data ?? { count: 0, totalQuantity: 0 };
  },

  /**
   * Add variant to cart
   * Postman: POST /api/customer/cart/items
   */
  async addItem(payload: AddCartItemPayload): Promise<CartItemResponse> {
    const response = await apiClient.post<CartItemResponse>(
      "/api/customer/cart/items",
      payload
    );
    return response.data!;
  },

  /**
   * Update cart item quantity
   * Postman: PUT /api/customer/cart/items/:variantUuid
   */
  async updateQuantity(
    variantUuid: string,
    quantity: number
  ): Promise<CartItemResponse> {
    const response = await apiClient.put<CartItemResponse>(
      `/api/customer/cart/items/${variantUuid}`,
      { quantity }
    );
    return response.data!;
  },

  /**
   * Remove item from cart
   * Postman: DELETE /api/customer/cart/items/:variantUuid
   */
  async removeItem(variantUuid: string): Promise<void> {
    await apiClient.delete(`/api/customer/cart/items/${variantUuid}`);
  },

  /**
   * Clear entire cart
   * Postman: DELETE /api/customer/cart
   */
  async clearCart(): Promise<void> {
    await apiClient.delete("/api/customer/cart");
  },

  /**
   * Apply coupon code to cart
   * Postman: POST /api/customer/cart/coupon
   */
  async applyCoupon(code: string): Promise<CartResponse> {
    const response = await apiClient.post<CartResponse>(
      "/api/customer/cart/coupon",
      { code }
    );
    return response.data!;
  },

  /**
   * Remove applied coupon from cart
   * Postman: DELETE /api/customer/cart/coupon
   */
  async removeCoupon(): Promise<CartResponse> {
    const response = await apiClient.delete<CartResponse>(
      "/api/customer/cart/coupon"
    );
    return response.data!;
  },
};
