import { ApiError } from "@/lib/api/api-error";
import { deliveryRepository } from "../repositories/delivery.repository";
import { userRepository } from "@/features/users/repositories/user.repository";
import type {
  AdminDeliveryOrdersListInput,
  AdminDeliveryStaffListInput,
  AssignDeliveryInput,
  StaffDeliveryListInput,
  MarkDeliveredInput,
  MarkFailedInput,
  RejectDeliveryInput,
} from "../validations/delivery.schema";
import type {
  AdminDeliveryOrderItem,
  DeliveryStaffBasic,
  StaffDeliveryListItem,
  StaffDeliveryDetailResponse,
  AssignDeliveryResult,
  DeliveryTransitionResult,
  DeliveryAddressInfo,
  StaffDeliveriesCountResponse,
} from "../types/delivery.types";

function formatShippingAddress(addresses: any[]): DeliveryAddressInfo | null {
  if (!addresses || addresses.length === 0) return null;
  const addr = addresses.find((a: any) => a.type === "shipping") || addresses[0];
  if (!addr) return null;
  return {
    fullName: addr.full_name,
    phone: addr.phone,
    addressLine1: addr.address_line1,
    addressLine2: addr.address_line2 ?? null,
    landmark: addr.landmark ?? null,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
  };
}

async function getAdminInternalId(email?: string | null): Promise<bigint | null> {
  if (!email) return null;
  const user = await userRepository.findByEmail(email);
  if (!user) return null;
  return BigInt(user.internalId || user.id);
}

export const deliveryService = {
  async getAdminDeliveryOrders(params: AdminDeliveryOrdersListInput) {
    const result = await deliveryRepository.findAdminDeliveryOrders(params);

    const data: AdminDeliveryOrderItem[] = result.orders.map((order) => {
      const latestShipment = order.shipments && order.shipments.length > 0 ? order.shipments[0] : null;

      return {
        id: order.uuid || String(order.id),
        orderNumber: order.orderNumber,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        totalAmount: Number(order.totalAmount),
        customer: {
          id: order.user.uuid || String(order.user.id),
          name: order.user.name,
          email: order.user.email,
          phone: order.user.phone,
        },
        deliverySlot: order.delivery_slots
          ? {
            id: order.delivery_slots.uuid || String(order.delivery_slots.id),
            slotDate: order.delivery_slots.slot_date
              ? order.delivery_slots.slot_date.toISOString().split("T")[0]
              : null,
            startTime: order.delivery_slots.start_time
              ? order.delivery_slots.start_time.toISOString().substring(11, 19)
              : null,
            endTime: order.delivery_slots.end_time
              ? order.delivery_slots.end_time.toISOString().substring(11, 19)
              : null,
          }
          : null,
        shippingAddress: formatShippingAddress(order.address),
        shipment: latestShipment
          ? {
            id: latestShipment.uuid || String(latestShipment.id),
            status: latestShipment.status,
            assignmentStatus: latestShipment.assignment_status || "pending",
            trackingNumber: latestShipment.tracking_number,
            deliveryNotes: latestShipment.delivery_notes,
            acceptedAt: latestShipment.accepted_at,
            shippedAt: latestShipment.shipped_at,
            deliveredAt: latestShipment.delivered_at,
            deliveryStaff: latestShipment.delivery_staff
              ? {
                id: latestShipment.delivery_staff.uuid || String(latestShipment.delivery_staff.id),
                name: latestShipment.delivery_staff.name,
                phone: latestShipment.delivery_staff.phone,
                avatar: latestShipment.delivery_staff.avatar ?? null,
              }
              : null,
            deliveryPartner: (latestShipment as any).delivery_partners
              ? {
                id: String((latestShipment as any).delivery_partners.id),
                name: (latestShipment as any).delivery_partners.name,
                code: (latestShipment as any).delivery_partners.code,
                contactNumber: (latestShipment as any).delivery_partners.contact_number ?? null,
              }
              : null,
            createdAt: latestShipment.created_at,
            updatedAt: latestShipment.updated_at,
          }
          : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return {
      data,
      meta: {
        page: result.page,
        limit: result.limit,
        pageSize: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  },

  async getAdminDeliveryStaff(params: AdminDeliveryStaffListInput) {
    const result = await deliveryRepository.findActiveDeliveryStaff(params);

    const data: DeliveryStaffBasic[] = result.staffList.map((s) => ({
      id: s.uuid || String(s.id),
      name: s.name,
      email: s.email || undefined,
      phone: s.phone,
      avatar: s.avatar ?? null,
      isActive: s.is_active,
    }));

    return {
      data,
      meta: {
        page: result.page,
        limit: result.limit,
        pageSize: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  },

  async assignDelivery(
    input: AssignDeliveryInput,
    adminEmail?: string | null
  ): Promise<AssignDeliveryResult> {
    const adminId = await getAdminInternalId(adminEmail);

    // 1. Look up Order
    const order = await deliveryRepository.findOrderByUuid(input.orderId);
    if (!order) {
      throw ApiError.notFound("Order not found");
    }

    // 2. Validate Order Status
    if (order.order_status !== "packed") {
      throw ApiError.badRequest(
        `Cannot assign delivery for order with status '${order.order_status}'. Order must be in 'packed' status.`
      );
    }

    // 3. Look up Staff
    const staff = await deliveryRepository.findStaffByUuid(input.staffId);
    if (!staff || staff.role?.slug !== "staff") {
      throw ApiError.notFound("Staff member not found or user is not a STAFF member");
    }

    // 4. Validate Staff Active Status
    if (!staff.is_active) {
      throw ApiError.badRequest("Cannot assign delivery to an inactive staff member");
    }

    // 5. Assign or Reassign Shipment
    const activeShipment = await deliveryRepository.findActiveShipmentByOrderId(order.id);
    let shipment;

    if (activeShipment) {
      if (activeShipment.assignment_status === "accepted") {
        throw ApiError.badRequest(
          `Cannot reassign delivery staff. Order has already been accepted by ${activeShipment.delivery_staff?.name || "the assigned staff"}.`
        );
      }

      shipment = await deliveryRepository.reassignShipmentTransaction({
        shipmentId: activeShipment.id,
        staffId: staff.id,
        note: input.note,
        adminId,
      });
    } else {
      shipment = await deliveryRepository.createShipmentTransaction({
        orderId: order.id,
        staffId: staff.id,
        note: input.note,
        adminId,
      });
    }

    return {
      id: shipment.uuid || String(shipment.id),
      orderId: order.uuid || String(order.id),
      status: shipment.status,
      assignmentStatus: shipment.assignment_status || "pending",
      deliveryStaff: {
        id: staff.uuid || String(staff.id),
        name: staff.name,
        phone: staff.phone,
      },
      createdAt: shipment.created_at,
    };
  },

  async getStaffDeliveries(
    sessionUserId: string,
    query: StaffDeliveryListInput
  ) {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const result = await deliveryRepository.findStaffDeliveries(
      staffUser.internalId,
      query
    );

    const data: StaffDeliveryListItem[] = result.shipmentsList.map((s) => ({
      id: s.uuid || String(s.id),
      status: s.status,
      assignmentStatus: s.assignment_status || "pending",
      deliveryNotes: s.delivery_notes,
      acceptedAt: s.accepted_at,
      shippedAt: s.shipped_at,
      deliveredAt: s.delivered_at,
      order: {
        id: s.orders.uuid || String(s.orders.id),
        orderNumber: s.orders.orderNumber,
        orderStatus: s.orders.order_status,
        paymentStatus: s.orders.payment_status,
        totalAmount: Number(s.orders.totalAmount),
        notes: s.orders.notes,
        placedAt: s.orders.placed_at,
        createdAt: s.orders.createdAt,
      },
      customer: {
        id: s.orders.user.uuid || String(s.orders.user.id),
        name: s.orders.user.name,
        email: s.orders.user.email,
        phone: s.orders.user.phone,
      },
      shippingAddress: formatShippingAddress(s.orders.address),
      deliverySlot: s.orders.delivery_slots
        ? {
          id: s.orders.delivery_slots.uuid || String(s.orders.delivery_slots.id),
          slotDate: s.orders.delivery_slots.slot_date
            ? s.orders.delivery_slots.slot_date.toISOString().split("T")[0]
            : null,
          startTime: s.orders.delivery_slots.start_time
            ? s.orders.delivery_slots.start_time.toISOString().substring(11, 19)
            : null,
          endTime: s.orders.delivery_slots.end_time
            ? s.orders.delivery_slots.end_time.toISOString().substring(11, 19)
            : null,
        }
        : null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return {
      data,
      meta: {
        page: result.page,
        limit: result.limit,
        pageSize: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  },

  async countStaffDeliveries(
    sessionUserId: string,
    query: StaffDeliveryListInput
  ): Promise<StaffDeliveriesCountResponse> {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    return deliveryRepository.countStaffDeliveries(
      staffUser.internalId,
      query
    );
  },

  async getStaffDeliveryByUuid(
    sessionUserId: string,
    uuid: string
  ): Promise<StaffDeliveryDetailResponse> {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const s = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!s) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    return {
      id: s.uuid || String(s.id),
      status: s.status,
      assignmentStatus: s.assignment_status || "pending",
      deliveryNotes: s.delivery_notes,
      acceptedAt: s.accepted_at,
      shippedAt: s.shipped_at,
      deliveredAt: s.delivered_at,
      order: {
        id: s.orders.uuid || String(s.orders.id),
        orderNumber: s.orders.orderNumber,
        orderStatus: s.orders.order_status,
        paymentStatus: s.orders.payment_status,
        totalAmount: Number(s.orders.totalAmount),
        notes: s.orders.notes,
        placedAt: s.orders.placed_at,
        createdAt: s.orders.createdAt,
      },
      customer: {
        id: s.orders.user.uuid || String(s.orders.user.id),
        name: s.orders.user.name,
        email: s.orders.user.email,
        phone: s.orders.user.phone,
      },
      shippingAddress: formatShippingAddress(s.orders.address),
      deliverySlot: s.orders.delivery_slots
        ? {
          id: s.orders.delivery_slots.uuid || String(s.orders.delivery_slots.id),
          slotDate: s.orders.delivery_slots.slot_date
            ? s.orders.delivery_slots.slot_date.toISOString().split("T")[0]
            : null,
          startTime: s.orders.delivery_slots.start_time
            ? s.orders.delivery_slots.start_time.toISOString().substring(11, 19)
            : null,
          endTime: s.orders.delivery_slots.end_time
            ? s.orders.delivery_slots.end_time.toISOString().substring(11, 19)
            : null,
        }
        : null,
      trackingHistory: (s.shipment_tracking || []).map((t) => ({
        status: t.status,
        location: t.location,
        note: t.note,
        trackedAt: t.tracked_at,
      })),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  },

  async acceptDelivery(
    sessionUserId: string,
    uuid: string
  ) {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const shipment = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!shipment) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    if (shipment.assignment_status === "accepted" || shipment.status === "picked_up") {
      throw ApiError.badRequest("Delivery assignment has already been accepted");
    }

    if (shipment.assignment_status !== "pending") {
      throw ApiError.badRequest(
        `Delivery cannot be accepted in '${shipment.assignment_status}' assignment state`
      );
    }

    const updated = await deliveryRepository.acceptDeliveryTransaction(
      shipment.id,
      staffUser.internalId
    );

    return {
      id: updated.uuid || String(updated.id),
      status: updated.status,
      assignmentStatus: updated.assignment_status || "accepted",
      acceptedAt: updated.accepted_at,
    };
  },

  async rejectDelivery(
    sessionUserId: string,
    uuid: string,
    input: RejectDeliveryInput
  ) {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const shipment = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!shipment) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    if (shipment.assignment_status === "accepted" || shipment.status === "picked_up") {
      throw ApiError.badRequest(
        "Cannot reject a delivery assignment that has already been accepted"
      );
    }

    if (shipment.assignment_status === "rejected") {
      throw ApiError.badRequest("Delivery assignment has already been rejected");
    }

    if (shipment.assignment_status !== "pending") {
      throw ApiError.badRequest(
        `Delivery cannot be rejected in '${shipment.assignment_status}' assignment state`
      );
    }

    const updated = await deliveryRepository.rejectDeliveryTransaction({
      shipmentId: shipment.id,
      orderId: shipment.orders.id,
      staffInternalId: staffUser.internalId,
      reason: input.reason,
      note: input.note,
    });

    return {
      id: updated.uuid || String(updated.id),
      status: updated.status,
      assignmentStatus: updated.assignment_status || "rejected",
      reason: input.reason,
    };
  },

  async markOutForDelivery(
    sessionUserId: string,
    uuid: string
  ): Promise<DeliveryTransitionResult> {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const shipment = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!shipment) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    if (shipment.assignment_status !== "accepted") {
      throw ApiError.badRequest(
        "Delivery must be accepted before marking out for delivery"
      );
    }

    if (shipment.status === "out_for_delivery") {
      throw ApiError.badRequest("Delivery is already marked as out for delivery");
    }

    if (shipment.status === "delivered") {
      throw ApiError.badRequest("Delivery is already delivered");
    }

    if (shipment.orders.order_status !== "packed") {
      throw ApiError.badRequest(
        `Order status is '${shipment.orders.order_status}'. Only 'packed' orders can be transitioned to 'out_for_delivery'.`
      );
    }

    const result = await deliveryRepository.markOutForDeliveryTransaction(
      shipment.id,
      shipment.orders.id,
      staffUser.internalId
    );

    return {
      shipmentId: result.shipment.uuid || String(result.shipment.id),
      orderId: result.order.uuid || String(result.order.id),
      shipmentStatus: result.shipment.status,
      orderStatus: result.order.order_status,
    };
  },

  async markDelivered(
    sessionUserId: string,
    uuid: string,
    input?: MarkDeliveredInput
  ): Promise<DeliveryTransitionResult> {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const shipment = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!shipment) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    if (shipment.status === "delivered") {
      throw ApiError.badRequest("Delivery is already marked as delivered");
    }

    if (shipment.status !== "out_for_delivery") {
      throw ApiError.badRequest(
        `Shipment status is '${shipment.status}'. Only 'out_for_delivery' shipments can be marked as delivered.`
      );
    }

    if (shipment.orders.order_status !== "out_for_delivery") {
      throw ApiError.badRequest(
        `Order status is '${shipment.orders.order_status}'. Only 'out_for_delivery' orders can be marked as delivered.`
      );
    }

    const result = await deliveryRepository.markDeliveredTransaction(
      shipment.id,
      shipment.orders.id,
      staffUser.internalId,
      input?.note
    );

    return {
      shipmentId: result.shipment.uuid || String(result.shipment.id),
      orderId: result.order.uuid || String(result.order.id),
      shipmentStatus: result.shipment.status,
      orderStatus: result.order.order_status,
    };
  },

  async markFailed(
    sessionUserId: string,
    uuid: string,
    input?: MarkFailedInput
  ): Promise<DeliveryTransitionResult> {
    const staffUser = await userRepository.findById(sessionUserId);
    if (!staffUser || !staffUser.internalId) {
      throw ApiError.unauthorized("Staff member not found");
    }

    const shipment = await deliveryRepository.findStaffDeliveryByUuid(
      uuid,
      staffUser.internalId
    );

    if (!shipment) {
      const anyShipment = await deliveryRepository.findShipmentByUuidOnly(uuid);
      if (anyShipment) {
        throw ApiError.forbidden("You do not have access to this delivery");
      }
      throw ApiError.notFound("Delivery not found");
    }

    const result = await deliveryRepository.markFailedTransaction(
      shipment.id,
      shipment.orders.id,
      staffUser.internalId,
      input?.reason,
      input?.note
    );

    return {
      shipmentId: result.shipment.uuid || String(result.shipment.id),
      orderId: result.order.uuid || String(result.order.id),
      shipmentStatus: result.shipment.status,
      orderStatus: result.order.order_status,
    };
  },
};
