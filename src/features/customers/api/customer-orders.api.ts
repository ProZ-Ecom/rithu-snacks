import { apiClient } from "@/lib/api/api-client";
import type {
  OrderDetailResponse,
  OrderListResponse,
} from "@/features/orders/types";

export interface CustomerOrdersQueryParams {
  page?: number;
  limit?: number;
  pageSize?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerOrderPayload {
  shippingAddressId: string;
  billingAddressId?: string;
  deliveryMethod?: string;
  notes?: string;
  paymentMethod?: "CARD" | "COD" | "UPI";
  paymentDetails?: Record<string, any>;
}

export interface CancelCustomerOrderPayload {
  note?: string;
}

export const customerOrdersApi = {
  /**
   * Fetch customer orders with query parameters
   * Postman: GET /api/customer/orders or POST /api/customer/orders/list
   */
  async getOrders(
    params: CustomerOrdersQueryParams = {}
  ): Promise<OrderListResponse<OrderDetailResponse>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    const limitVal = params.limit ?? params.pageSize;
    if (limitVal) searchParams.set("limit", String(limitVal));
    if (params.status) searchParams.set("status", params.status);
    if (params.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    if (params.search) searchParams.set("search", params.search);
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const qs = searchParams.toString();
    const url = `/api/customer/orders${qs ? `?${qs}` : ""}`;
    const response = await apiClient.get<OrderDetailResponse[]>(url);

    return {
      data: response.data ?? [],
      meta: (response.meta as OrderListResponse["meta"]) ?? {
        page: params.page ?? 1,
        limit: limitVal ?? 20,
        pageSize: limitVal ?? 20,
        total: response.data?.length ?? 0,
        totalPages: 1,
      },
    };
  },

  /**
   * Fetch customer orders via POST with filter body
   * Postman: POST /api/customer/orders or POST /api/customer/orders/list
   */
  async listOrders(
    payload: Record<string, any> = {}
  ): Promise<OrderListResponse<OrderDetailResponse>> {
    const response = await apiClient.post<OrderDetailResponse[]>(
      "/api/customer/orders/list",
      payload
    );

    return {
      data: response.data ?? [],
      meta: (response.meta as OrderListResponse["meta"]) ?? {
        page: payload.page ?? 1,
        limit: payload.limit ?? payload.pageSize ?? 20,
        pageSize: payload.limit ?? payload.pageSize ?? 20,
        total: response.data?.length ?? 0,
        totalPages: 1,
      },
    };
  },


  /**
   * Fetch single order detail by UUID
   * Postman: GET /api/customer/orders/:orderUuid
   */
  async getOrderByUuid(uuid: string): Promise<OrderDetailResponse> {
    const response = await apiClient.get<OrderDetailResponse>(
      `/api/customer/orders/${uuid}`
    );
    return response.data!;
  },

  /**
   * Place a new order
   * Postman: POST /api/customer/orders
   */
  async createOrder(
    payload: CreateCustomerOrderPayload
  ): Promise<OrderDetailResponse> {
    const response = await apiClient.post<any>(
      "/api/customer/orders",
      payload
    );
    const result = (response as any)?.data?.data ?? (response as any)?.data ?? response;
    return result as OrderDetailResponse;
  },

  /**
   * Cancel an order
   * Postman: POST /api/customer/orders/:orderUuid/cancel
   */
  async cancelOrder(
    uuid: string,
    payload: CancelCustomerOrderPayload = {}
  ): Promise<OrderDetailResponse> {
    const response = await apiClient.post<OrderDetailResponse>(
      `/api/customer/orders/${uuid}/cancel`,
      payload
    );
    return response.data!;
  },
};
