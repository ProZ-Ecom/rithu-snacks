import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";
import type {
  AdminDeliveryOrdersListInput,
  AdminDeliveryStaffListInput,
  StaffDeliveryListInput,
} from "../validations/delivery.schema";
import type {
  StaffDeliveriesCountResponse,
  DeliveryStatusCounts,
} from "../types/delivery.types";

export const deliveryRepository = {
  async findAdminDeliveryOrders(params: AdminDeliveryOrdersListInput) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      is_active: true,
    };

    if (params.orderStatus) {
      where.order_status = params.orderStatus;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { orderNumber: { contains: s } },
        { user: { name: { contains: s } } },
        { user: { email: { contains: s } } },
        { user: { phone: { contains: s } } },
      ];
    }

    if (params.deliveryStatus || params.staffId) {
      const shipmentWhere: Prisma.shipmentsWhereInput = {};
      if (params.deliveryStatus) {
        shipmentWhere.status = params.deliveryStatus;
      }
      if (params.staffId) {
        shipmentWhere.delivery_staff = { uuid: params.staffId };
      }
      where.shipments = { some: shipmentWhere };
    }

    const sortOrder = params.sortOrder ?? "desc";
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: sortOrder };

    if (params.sortBy === "orderNumber") {
      orderBy = { orderNumber: sortOrder };
    } else if (params.sortBy === "totalAmount") {
      orderBy = { totalAmount: sortOrder };
    } else if (params.sortBy === "orderStatus") {
      orderBy = { order_status: sortOrder };
    } else if (params.sortBy === "updatedAt") {
      orderBy = { updatedAt: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              uuid: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          delivery_slots: {
            select: {
              id: true,
              uuid: true,
              slot_date: true,
              start_time: true,
              end_time: true,
            },
          },
          address: {
            where: { is_active: true },
            take: 2,
          },
          shipments: {
            orderBy: { id: "desc" },
            take: 1,
            include: {
              delivery_staff: {
                select: {
                  id: true,
                  uuid: true,
                  name: true,
                  phone: true,
                  avatar: true,
                },
              },
              delivery_partners: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  contact_number: true,
                },
              },
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
    };
  },

  async findActiveDeliveryStaff(params: AdminDeliveryStaffListInput) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: { slug: "staff" },
      deleted_at: null,
      ...(params.isActive !== undefined ? { is_active: params.isActive } : {}),
    };

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
      ];
    }

    const sortOrder = params.sortOrder ?? "asc";
    const sortBy = params.sortBy ?? "name";
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [staffList, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          uuid: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          is_active: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      staffList,
      total,
      page,
      limit,
    };
  },

  async findOrderByUuid(uuid: string) {
    return db.order.findFirst({
      where: { uuid, is_active: true },
      include: {
        user: true,
      },
    });
  },

  async findStaffByUuid(uuid: string) {
    return db.user.findFirst({
      where: {
        uuid,
        role: { slug: "staff" },
        deleted_at: null,
      },
      include: {
        role: true,
      },
    });
  },

  async findActiveShipmentByOrderId(orderId: bigint) {
    return db.shipments.findFirst({
      where: {
        order_id: orderId,
        is_active: true,
      },
      orderBy: { id: "desc" },
      include: {
        delivery_staff: {
          select: {
            id: true,
            uuid: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  },

  async createShipmentTransaction(data: {
    orderId: bigint;
    staffId: bigint;
    note?: string;
    adminId?: bigint | null;
  }) {
    const shipmentUuid = crypto.randomUUID();

    return db.$transaction(async (tx) => {
      const shipment = await tx.shipments.create({
        data: {
          uuid: shipmentUuid,
          order_id: data.orderId,
          delivery_staff_id: data.staffId,
          status: "pending",
          assignment_status: "pending",
          delivery_notes: data.note || null,
          created_by: data.adminId,
          updated_by: data.adminId,
        },
        include: {
          delivery_staff: {
            select: {
              id: true,
              uuid: true,
              name: true,
              phone: true,
            },
          },
          orders: {
            select: {
              id: true,
              uuid: true,
              orderNumber: true,
            },
          },
        },
      });

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipment.id,
          status: "assigned",
          note: data.note || "Delivery assigned to staff",
          created_by: data.adminId,
          updated_by: data.adminId,
        },
      });

      return shipment;
    });
  },

  async reassignShipmentTransaction(data: {
    shipmentId: bigint;
    staffId: bigint;
    note?: string;
    adminId?: bigint | null;
  }) {
    return db.$transaction(async (tx) => {
      const now = new Date();
      const shipment = await tx.shipments.update({
        where: { id: data.shipmentId },
        data: {
          delivery_staff_id: data.staffId,
          status: "pending",
          assignment_status: "pending",
          accepted_at: null,
          delivery_notes: data.note || null,
          updated_at: now,
          updated_by: data.adminId,
        },
        include: {
          delivery_staff: {
            select: {
              id: true,
              uuid: true,
              name: true,
              phone: true,
            },
          },
          orders: {
            select: {
              id: true,
              uuid: true,
              orderNumber: true,
            },
          },
        },
      });

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipment.id,
          status: "reassigned",
          note:
            data.note ||
            `Delivery reassigned to ${shipment.delivery_staff?.name || "staff"}`,
          created_by: data.adminId,
          updated_by: data.adminId,
        },
      });

      return shipment;
    });
  },

  buildStaffDeliveriesBaseWhere(
    staffInternalId: bigint,
    params: StaffDeliveryListInput
  ): Prisma.shipmentsWhereInput {
    const where: Prisma.shipmentsWhereInput = {
      delivery_staff_id: staffInternalId,
      is_active: true,
    };

    if (params.search) {
      const s = params.search.trim();
      where.orders = {
        OR: [
          { orderNumber: { contains: s } },
          { user: { name: { contains: s } } },
          { user: { phone: { contains: s } } },
          { address: { some: { city: { contains: s } } } },
        ],
      };
    }

    return where;
  },

  buildStaffDeliveriesWhere(
    staffInternalId: bigint,
    params: StaffDeliveryListInput
  ): Prisma.shipmentsWhereInput {
    const where = this.buildStaffDeliveriesBaseWhere(staffInternalId, params);

    if (params.status) {
      where.status = params.status;
    }

    if (params.assignmentStatus) {
      where.assignment_status = params.assignmentStatus;
    }

    return where;
  },

  async countStaffDeliveries(
    staffInternalId: bigint,
    params: StaffDeliveryListInput
  ): Promise<StaffDeliveriesCountResponse> {
    const baseWhere = this.buildStaffDeliveriesBaseWhere(staffInternalId, params);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayWhere: Prisma.shipmentsWhereInput = {
      ...baseWhere,
      created_at: {
        gte: startOfToday,
        lte: endOfToday,
      },
    };

    const [todayGrouped, allTimeGrouped] = await Promise.all([
      db.shipments.groupBy({
        by: ["status"],
        where: todayWhere,
        _count: { id: true },
      }),
      db.shipments.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { id: true },
      }),
    ]);

    const initialCounts = (): DeliveryStatusCounts => ({
      pending: 0,
      picked_up: 0,
      in_transit: 0,
      out_for_delivery: 0,
      delivered: 0,
      failed: 0,
      total: 0,
    });

    const todayCounts = initialCounts();
    for (const item of todayGrouped) {
      const statusKey = item.status as keyof DeliveryStatusCounts;
      if (statusKey in todayCounts && statusKey !== "total") {
        todayCounts[statusKey] = item._count.id;
        todayCounts.total += item._count.id;
      }
    }

    const allTimeCounts = initialCounts();
    for (const item of allTimeGrouped) {
      const statusKey = item.status as keyof DeliveryStatusCounts;
      if (statusKey in allTimeCounts && statusKey !== "total") {
        allTimeCounts[statusKey] = item._count.id;
        allTimeCounts.total += item._count.id;
      }
    }

    return {
      today: todayCounts,
      allTime: allTimeCounts,
    };
  },

  async findStaffDeliveries(
    staffInternalId: bigint,
    params: StaffDeliveryListInput
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? params.pageSize ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildStaffDeliveriesWhere(staffInternalId, params);

    const sortOrder = params.sortOrder ?? "desc";
    const sortBy = params.sortBy ?? "createdAt";
    const orderBy: Prisma.shipmentsOrderByWithRelationInput = {
      [sortBy === "createdAt" ? "created_at" : sortBy === "updatedAt" ? "updated_at" : sortBy === "shippedAt" ? "shipped_at" : "delivered_at"]: sortOrder,
    };

    const [shipmentsList, total] = await Promise.all([
      db.shipments.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          orders: {
            include: {
              user: {
                select: {
                  id: true,
                  uuid: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              delivery_slots: {
                select: {
                  id: true,
                  uuid: true,
                  slot_date: true,
                  start_time: true,
                  end_time: true,
                },
              },
              address: {
                where: { is_active: true },
              },
            },
          },
        },
      }),
      db.shipments.count({ where }),
    ]);

    return {
      shipmentsList,
      total,
      page,
      limit,
    };
  },

  async findStaffDeliveryByUuid(uuid: string, staffInternalId: bigint) {
    return db.shipments.findFirst({
      where: {
        uuid,
        delivery_staff_id: staffInternalId,
        is_active: true,
      },
      include: {
        orders: {
          include: {
            user: {
              select: {
                id: true,
                uuid: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            delivery_slots: {
              select: {
                id: true,
                uuid: true,
                slot_date: true,
                start_time: true,
                end_time: true,
              },
            },
            address: {
              where: { is_active: true },
            },
          },
        },
        shipment_tracking: {
          orderBy: { id: "asc" },
        },
      },
    });
  },

  async findShipmentByUuidOnly(uuid: string) {
    return db.shipments.findFirst({
      where: {
        uuid,
        is_active: true,
      },
      include: {
        orders: true,
      },
    });
  },

  async acceptDeliveryTransaction(
    shipmentId: bigint,
    staffInternalId: bigint
  ) {
    return db.$transaction(async (tx) => {
      const updatedShipment = await tx.shipments.update({
        where: { id: shipmentId },
        data: {
          assignment_status: "accepted",
          status: "picked_up",
          accepted_at: new Date(),
          updated_by: staffInternalId,
        },
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              order_status: true,
            },
          },
          delivery_staff: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const staffName = updatedShipment.delivery_staff?.name || "Delivery staff";
      const orderNumber = updatedShipment.orders?.orderNumber || String(updatedShipment.order_id);

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipmentId,
          status: "accepted",
          note: `Delivery accepted by ${staffName}`,
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      if (updatedShipment.orders) {
        await tx.order_status_history.create({
          data: {
            order_id: updatedShipment.orders.id,
            status: updatedShipment.orders.order_status,
            note: `Delivery assignment accepted by staff ${staffName}`,
            changed_by: staffInternalId,
            created_by: staffInternalId,
            updated_by: staffInternalId,
          },
        });
      }

      // Notify Admins
      const adminUsers = await tx.user.findMany({
        where: {
          role: { slug: { in: ["admin", "super-admin"] } },
          deleted_at: null,
          is_active: true,
        },
        select: { id: true },
      });

      if (adminUsers.length > 0) {
        await tx.notification.createMany({
          data: adminUsers.map((admin) => ({
            userId: admin.id,
            title: "Delivery Assignment Accepted",
            message: `Staff ${staffName} accepted order #${orderNumber}`,
            type: "staff_order_accepted",
            created_by: staffInternalId,
            updated_by: staffInternalId,
          })),
        });
      }

      return updatedShipment;
    });
  },

  async rejectDeliveryTransaction(params: {
    shipmentId: bigint;
    orderId: bigint;
    staffInternalId: bigint;
    reason: string;
    note?: string;
  }) {
    return db.$transaction(async (tx) => {
      const fullReason = [params.reason, params.note].filter(Boolean).join(" - ");

      const updatedShipment = await tx.shipments.update({
        where: { id: params.shipmentId },
        data: {
          assignment_status: "rejected",
          status: "failed",
          delivery_notes: fullReason,
          updated_at: new Date(),
          updated_by: params.staffInternalId,
        },
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              order_status: true,
            },
          },
          delivery_staff: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const staffName = updatedShipment.delivery_staff?.name || "Delivery staff";
      const orderNumber = updatedShipment.orders?.orderNumber || String(params.orderId);

      await tx.shipment_tracking.create({
        data: {
          shipment_id: params.shipmentId,
          status: "rejected",
          note: `Delivery rejected by ${staffName}: ${fullReason}`,
          created_by: params.staffInternalId,
          updated_by: params.staffInternalId,
        },
      });

      if (updatedShipment.orders) {
        await tx.order_status_history.create({
          data: {
            order_id: updatedShipment.orders.id,
            status: updatedShipment.orders.order_status,
            note: `Staff ${staffName} rejected delivery assignment: ${fullReason}`,
            changed_by: params.staffInternalId,
            created_by: params.staffInternalId,
            updated_by: params.staffInternalId,
          },
        });
      }

      // Notify Admins
      const adminUsers = await tx.user.findMany({
        where: {
          role: { slug: { in: ["admin", "super-admin"] } },
          deleted_at: null,
          is_active: true,
        },
        select: { id: true },
      });

      if (adminUsers.length > 0) {
        await tx.notification.createMany({
          data: adminUsers.map((admin) => ({
            userId: admin.id,
            title: "Delivery Assignment Rejected",
            message: `Staff ${staffName} rejected order #${orderNumber}. Reason: ${params.reason}`,
            type: "staff_order_rejected",
            created_by: params.staffInternalId,
            updated_by: params.staffInternalId,
          })),
        });
      }

      return updatedShipment;
    });
  },

  async markOutForDeliveryTransaction(
    shipmentId: bigint,
    orderId: bigint,
    staffInternalId: bigint
  ) {
    return db.$transaction(async (tx) => {
      const now = new Date();

      const updatedShipment = await tx.shipments.update({
        where: { id: shipmentId },
        data: {
          status: "out_for_delivery",
          shipped_at: now,
          updated_by: staffInternalId,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          order_status: "out_for_delivery",
          updated_by: staffInternalId,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: orderId,
          status: "out_for_delivery",
          note: "Order is out for delivery",
          changed_by: staffInternalId,
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipmentId,
          status: "out_for_delivery",
          note: "Order is out for delivery",
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      return {
        shipment: updatedShipment,
        order: updatedOrder,
      };
    });
  },

  async markDeliveredTransaction(
    shipmentId: bigint,
    orderId: bigint,
    staffInternalId: bigint,
    note?: string
  ) {
    return db.$transaction(async (tx) => {
      const now = new Date();

      const updatedShipment = await tx.shipments.update({
        where: { id: shipmentId },
        data: {
          status: "delivered",
          delivered_at: now,
          updated_by: staffInternalId,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          order_status: "delivered",
          updated_by: staffInternalId,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: orderId,
          status: "delivered",
          note: note || "Order delivered successfully",
          changed_by: staffInternalId,
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipmentId,
          status: "delivered",
          note: note || "Order delivered successfully",
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      return {
        shipment: updatedShipment,
        order: updatedOrder,
      };
    });
  },

  async markFailedTransaction(
    shipmentId: bigint,
    orderId: bigint,
    staffInternalId: bigint,
    reason?: string,
    note?: string
  ) {
    return db.$transaction(async (tx) => {
      const failureNote = [reason, note].filter(Boolean).join(" - ") || "Delivery failed";

      const updatedShipment = await tx.shipments.update({
        where: { id: shipmentId },
        data: {
          status: "failed",
          delivery_notes: failureNote,
          updated_by: staffInternalId,
        },
      });

      await tx.shipment_tracking.create({
        data: {
          shipment_id: shipmentId,
          status: "failed",
          note: failureNote,
          created_by: staffInternalId,
          updated_by: staffInternalId,
        },
      });

      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      return {
        shipment: updatedShipment,
        order: updatedOrder,
      };
    });
  },
};
