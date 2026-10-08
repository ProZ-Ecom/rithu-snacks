import { apiClient } from "@/lib/api/api-client";
import type {
  CheckoutSummary,
  DeliveryMethod,
  GetOrdersParams,
  GetOrdersResult,
  OrderDetail,
  OrderListItem,
  PlaceOrderInput,
  UpdateOrderStatusInput,
  AdminOrdersListParams,
  AdminOrdersCountResponse,
  OrderListResponse,
  OrderListItemResponse,
  OrderDetailResponse,
  OrderStatusTransitionResponse,
} from "../types";

function buildParams(params?: GetOrdersParams) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getOrders(params?: GetOrdersParams): Promise<GetOrdersResult> {
  const response = await apiClient.get<GetOrdersResult>(`/api/orders${buildParams(params)}`);
  return response.data!;
}

export async function getOrder(id: number): Promise<OrderDetail> {
  const response = await apiClient.get<OrderDetail>(`/api/orders/${id}`);
  return response.data!;
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail> {
  const response = await apiClient.get<OrderDetail>(
    `/api/orders/number/${orderNumber}`
  );
  return response.data!;
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderDetail> {
  const response = await apiClient.post<OrderDetail>("/api/orders", input);
  return response.data!;
}

export async function cancelOrder(
  id: number,
  input?: { reason?: string }
): Promise<OrderDetail> {
  const response = await apiClient.patch<OrderDetail>(
    `/api/orders/${id}/cancel`,
    input ?? {}
  );
  return response.data!;
}

export async function getAdminOrders(
  params?: AdminOrdersListParams
): Promise<OrderListResponse<OrderListItemResponse>> {
  const body: Record<string, unknown> = {};

  if (params?.page) body.page = Number(params.page);
  const pageSizeValue = params?.pageSize ?? params?.limit;
  if (pageSizeValue !== undefined) {
    body.pageSize = Number(pageSizeValue);
  }
  if (params?.search && params.search.trim()) {
    body.search = params.search.trim();
  }
  if (params?.customerId) {
    body.customerId = params.customerId;
  }
  if (params?.status) {
    body.status = params.status;
  }
  if (params?.paymentStatus) {
    body.paymentStatus = params.paymentStatus;
  }
  if (params?.sortBy) {
    body.sortBy = params.sortBy;
  }
  if (params?.sortOrder) {
    body.sortOrder = params.sortOrder;
  }

  const response = await apiClient.post<OrderListItemResponse[]>(
    "/api/admin/orders/list",
    body
  );

  return {
    data: response.data ?? [],
    meta: (response.meta as OrderListResponse["meta"]) ?? {
      page: params?.page ?? 1,
      limit: pageSizeValue ?? 20,
      pageSize: pageSizeValue ?? 20,
      total: response.data?.length ?? 0,
      totalPages: 1,
    },
  };
}

/**
 * Fetch admin orders count broken down by status.
 * Postman: POST /api/admin/orders/count
 */
export async function getAdminOrdersCount(
  params?: Partial<AdminOrdersListParams>
): Promise<AdminOrdersCountResponse> {
  const body: Record<string, unknown> = {};

  if (params?.search && params.search.trim()) {
    body.search = params.search.trim();
  }
  if (params?.customerId) {
    body.customerId = params.customerId;
  }
  if (params?.status) {
    body.status = params.status;
  }
  if (params?.paymentStatus) {
    body.paymentStatus = params.paymentStatus;
  }

  const response = await apiClient.post<AdminOrdersCountResponse>(
    "/api/admin/orders/count",
    body
  );

  return (
    response.data ?? {
      pending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      shipped: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      total: 0,
    }
  );
}

export async function getAdminOrder(
  uuid: string | number
): Promise<OrderDetailResponse> {
  const response = await apiClient.get<OrderDetailResponse>(
    `/api/admin/orders/${uuid}`
  );
  return response.data!;
}

export async function confirmAdminOrder(
  uuid: string | number,
  note?: string
): Promise<OrderStatusTransitionResponse> {
  const response = await apiClient.post<OrderStatusTransitionResponse>(
    `/api/admin/orders/${uuid}/confirm`,
    { note: note || "Order confirmed" }
  );
  return response.data!;
}

export async function processAdminOrder(
  uuid: string | number,
  note?: string
): Promise<OrderStatusTransitionResponse> {
  const response = await apiClient.post<OrderStatusTransitionResponse>(
    `/api/admin/orders/${uuid}/process`,
    { note: note || "Order preparation started" }
  );
  return response.data!;
}

export async function packAdminOrder(
  uuid: string | number,
  note?: string
): Promise<OrderStatusTransitionResponse> {
  const response = await apiClient.post<OrderStatusTransitionResponse>(
    `/api/admin/orders/${uuid}/pack`,
    { note: note || "Order packed and ready for dispatch" }
  );
  return response.data!;
}

export async function cancelOrderAdmin(
  idOrUuid: string | number,
  input?: { reason?: string; note?: string }
): Promise<OrderDetailResponse> {
  const response = await apiClient.post<OrderDetailResponse>(
    `/api/admin/orders/${idOrUuid}/cancel`,
    { note: input?.note || input?.reason || "Order cancelled by admin" }
  );
  return response.data!;
}

export interface AssignDeliveryInput {
  orderId: string;
  staffId: string;
  note?: string;
}

export interface AssignDeliveryResponse {
  id: string;
  orderId: string;
  status: string;
  assignmentStatus: string;
  deliveryStaff: {
    id: string;
    name: string;
    phone: string | null;
  };
  createdAt: Date;
}

export async function assignOrderDelivery(
  input: AssignDeliveryInput
): Promise<AssignDeliveryResponse> {
  const response = await apiClient.post<AssignDeliveryResponse>(
    "/api/admin/delivery/assign",
    input
  );
  return response.data!;
}

export async function getCheckoutSummary(
  input: { deliveryMethod?: DeliveryMethod; couponCode?: string }
): Promise<CheckoutSummary> {
  const response = await apiClient.post<CheckoutSummary>(
    "/api/checkout/summary",
    input ?? {}
  );
  return response.data!;
}

export interface DeliveryPartnerItem {
  id: string;
  name: string;
  code: string;
  contactNumber: string | null;
  isActive: boolean;
}

export interface ShipOrderCourierPayload {
  deliveryPartnerId: string | number;
  trackingNumber: string;
  notes?: string;
}

export async function getDeliveryPartners(): Promise<DeliveryPartnerItem[]> {
  const response = await apiClient.get<DeliveryPartnerItem[]>("/api/admin/delivery/partners");
  return response.data || [];
}

export async function shipOrderCourier(
  uuid: string | number,
  payload: ShipOrderCourierPayload
): Promise<OrderDetailResponse> {
  const response = await apiClient.post<OrderDetailResponse>(
    `/api/admin/orders/${uuid}/ship`,
    payload
  );
  return response.data!;
}


