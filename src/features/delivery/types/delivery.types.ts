export interface DeliveryStaffBasic {
  id: string; // Staff UUID
  name: string;
  email?: string;
  phone: string | null;
  avatar?: string | null;
  isActive?: boolean;
}

export interface DeliveryPartnerBasic {
  id: string;
  name: string;
  code: string;
  contactNumber: string | null;
}

export interface DeliverySlotInfo {
  id: string; // Slot UUID
  slotDate: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface DeliveryCustomerInfo {
  id: string; // Customer UUID
  name: string;
  email: string | null;
  phone: string | null;
}

export interface DeliveryAddressInfo {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface ShipmentTrackingItem {
  status: string;
  location: string | null;
  note: string | null;
  trackedAt: Date;
}

export interface ShipmentInfo {
  id: string; // Shipment UUID
  status: string;
  assignmentStatus: string;
  trackingNumber: string | null;
  deliveryNotes: string | null;
  acceptedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  deliveryStaff: DeliveryStaffBasic | null;
  deliveryPartner?: DeliveryPartnerBasic | null;
  trackingHistory?: ShipmentTrackingItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDeliveryOrderItem {
  id: string; // Order UUID
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  customer: DeliveryCustomerInfo;
  deliverySlot: DeliverySlotInfo | null;
  shippingAddress: DeliveryAddressInfo | null;
  shipment: ShipmentInfo | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffDeliveryListItem {
  id: string; // Shipment UUID
  status: string;
  assignmentStatus: string;
  deliveryNotes: string | null;
  acceptedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  order: {
    id: string; // Order UUID
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: number;
    notes: string | null;
    placedAt: Date | null;
    createdAt: Date;
  };
  customer: DeliveryCustomerInfo;
  shippingAddress: DeliveryAddressInfo | null;
  deliverySlot: DeliverySlotInfo | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffDeliveryDetailResponse extends StaffDeliveryListItem {
  trackingHistory: ShipmentTrackingItem[];
}

export interface AssignDeliveryResult {
  id: string; // Shipment UUID
  orderId: string; // Order UUID
  status: string;
  assignmentStatus: string;
  deliveryStaff: DeliveryStaffBasic;
  createdAt: Date;
}

export interface DeliveryTransitionResult {
  shipmentId: string;
  orderId: string;
  shipmentStatus: string;
  orderStatus: string;
}

export interface DeliveryStatusCounts {
  pending: number;
  picked_up: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  failed: number;
  total: number;
}

export interface StaffDeliveriesCountResponse {
  today: DeliveryStatusCounts;
  allTime: DeliveryStatusCounts;
}

