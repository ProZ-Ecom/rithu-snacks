import type { orders_order_status, orders_payment_status, order_addresses_type } from "@/generated/prisma";
import type { VariantMeasurement } from "@/features/variants/utils/measurement.util";

export type OrderStatus = orders_order_status;
export type PaymentStatus = orders_payment_status;
export type OrderAddressType = order_addresses_type;

export interface OrderCustomerDto {
  id: string; // user.uuid
  customerId: string | null; // user.cust_id
  name: string;
  email: string | null;
  phone: string | null;
}

export interface OrderItemResponse {
  id: string; // item.uuid
  productId: string; // product.uuid
  variantId: string; // variant.uuid (item-level)
  variantUnitPriceId: string; // variant_unit_price.uuid (pack size)
  productName: string; // snapshot
  variantName: string; // snapshot
  sku: string; // snapshot
  measurement: VariantMeasurement;
  primaryImage: string | null;
  quantity: number;
  /** Undiscounted price per unit at the time the order was placed. */
  unitPrice: number;
  /** Money the applied offer took off this line, across all its units. */
  discountAmount: number;
  taxAmount: number;
  /** What the customer actually paid for this line, after the offer. */
  totalPrice: number;
}

export interface OrderAddressResponse {
  id: string; // address.uuid
  type: OrderAddressType;
  addressType: "shipping" | "billing";
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface OrderStatusHistoryResponse {
  id: string; // history id string or uuid
  status: string;
  note: string | null;
  createdAt: Date;
}

export interface OrderDeliveryStaffDto {
  id: string; // staff.uuid
  name: string;
  email: string | null;
  phone: string | null;
}

export interface OrderDeliveryPartnerDto {
  id: string;
  name: string;
  code: string;
  contactNumber: string | null;
}

export interface OrderDeliveryDto {
  isAssigned: boolean;
  assignmentStatus: string | null;
  deliveryId: string | null;
  staff: OrderDeliveryStaffDto | null;
  assignedAt: Date | string | null;
  trackingNumber?: string | null;
  deliveryPartnerId?: string | null;
  deliveryPartner?: OrderDeliveryPartnerDto | null;
  status?: string | null;
  shippedAt?: Date | string | null;
  deliveryNotes?: string | null;
}

export interface OrderListItemResponse {
  id: string; // order.uuid
  orderNumber: string;
  customer: OrderCustomerDto;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCharge: number;
  totalAmount: number;
  totalItems: number;
  delivery?: OrderDeliveryDto;
  notes: string | null;
  placedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetailResponse extends OrderListItemResponse {
  items: OrderItemResponse[];
  shippingAddress: OrderAddressResponse | null;
  billingAddress: OrderAddressResponse | null;
  statusHistory: OrderStatusHistoryResponse[];
}

export interface OrderStatusTransitionResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface OrderPaginationMeta {
  page: number;
  limit: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OrderListResponse<T = OrderListItemResponse> {
  data: T[];
  meta: OrderPaginationMeta;
}

export type DeliveryMethod = "standard" | "express";
export type PaymentMethod =
  | "CASH_ON_DELIVERY"
  | "UPI"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "NET_BANKING"
  | "WALLET"
  | "CARD"
  | "COD";

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface OrderListItem {
  id: number | string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  itemCount?: number;
  totalItems?: number;
  createdAt: Date | string;
  items?: OrderItemResponse[];
  customer?: OrderCustomerDto;
}

export interface OrderDetail extends OrderListItem {
  shippingAddress?: OrderAddressResponse | null;
  billingAddress?: OrderAddressResponse | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCharge: number;
  notes?: string | null;
}

export interface GetOrdersResult {
  orders: OrderListItem[];
  pagination?: OrderPaginationMeta;
  total?: number;
}

export interface PlaceOrderInput {
  shippingAddressId?: string;
  addressId?: number | string;
  billingAddressId?: string;
  deliveryMethod?: DeliveryMethod | string;
  paymentMethod?: PaymentMethod | string;
  couponCode?: string;
  notes?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
}

export interface CheckoutSummary {
  subtotal: number;
  discountAmount?: number;
  discount?: number;
  taxAmount?: number;
  shippingCharge?: number;
  deliveryCharge?: number;
  totalAmount?: number;
  total?: number;
  totalSavings?: number;
  items?: any[];
  totals?: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  };
  coupon?: { code: string; discount: number } | null;
  couponCode?: string | null;
  appliedCoupon?: unknown;
}

export interface AdminOrdersListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sortBy?:
    | "orderNumber"
    | "createdAt"
    | "updatedAt"
    | "placedAt"
    | "totalAmount"
    | "orderStatus"
    | "paymentStatus";
  sortOrder?: "asc" | "desc";
}

export interface OrderItemDisplay {
  id: string;
  productName: string;
  productSlug?: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  image?: string | null;
}

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partial_refund",
] as const;

export interface AdminOrdersCountResponse {
  pending: number;
  confirmed: number;
  processing: number;
  packed: number;
  shipped: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
  returned: number;
  total: number;
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

export interface TrackingCheckpoint {
  date: string;
  status: string;
  location: string;
  isDelivered?: boolean;
}

export interface TrackingSummary {
  awb: string;
  currentStatus: string;
  origin?: string;
  destination?: string;
  consignment?: string;
  bookingDate?: string;
  deliveryDate?: string;
}

export interface TrackingResult {
  success: boolean;
  awb: string;
  courier: string;
  summary?: TrackingSummary;
  checkpoints: TrackingCheckpoint[];
  error?: string;
  officialUrl?: string;
}



