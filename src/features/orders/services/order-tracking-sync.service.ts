import { db } from "@/lib/db/prisma";
import {
  fetchSTCourierTracking,
  type TrackingResult,
} from "./courier-tracking.service";

export interface TrackingSyncResult {
  synced: boolean;
  orderId?: string;
  orderNumber?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
}

/**
 * Synchronize order and shipment status in the database based on live tracking info.
 *
 * Rules:
 * 1. Admin manual override protection: Never touch orders with status 'cancelled' or 'returned'.
 * 2. If ST Courier reports 'Delivered':
 *    - Update order status to 'delivered'
 *    - Update shipment status to 'delivered' and set delivered_at timestamp
 *    - Append record to order_status_history
 * 3. If ST Courier reports 'Out for Delivery':
 *    - Update order status from 'shipped' to 'out_for_delivery'
 *    - Update shipment status to 'out_for_delivery'
 *    - Append record to order_status_history
 */
export async function syncOrderStatusFromTrackingResult(
  awb: string,
  trackingResult: TrackingResult,
  targetOrderId?: bigint
): Promise<TrackingSyncResult> {
  const cleanAwb = (awb || "").trim();
  if (!cleanAwb || !trackingResult.success) {
    return { synced: false, reason: "Tracking not available or failed" };
  }

  // Find shipment matching the tracking number (and targetOrderId if provided)
  const shipment = await db.shipments.findFirst({
    where: {
      tracking_number: cleanAwb,
      is_active: true,
      ...(targetOrderId ? { order_id: targetOrderId } : {}),
    },
    include: {
      orders: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (!shipment || !shipment.orders) {
    return {
      synced: false,
      reason: `No active shipment matching AWB '${cleanAwb}' in database`,
    };
  }

  const order = shipment.orders;
  const currentOrderStatus = order.order_status;

  // Manual admin protection: Never override cancelled or returned orders
  if (currentOrderStatus === "cancelled" || currentOrderStatus === "returned") {
    return {
      synced: false,
      orderId: String(order.id),
      orderNumber: order.orderNumber,
      reason: `Order is already '${currentOrderStatus}' (manual admin override protected)`,
    };
  }

  // Detect ST Courier status
  const currentStatusText = (
    trackingResult.summary?.currentStatus || ""
  ).toLowerCase();

  const isDelivered =
    currentStatusText.includes("delivered") ||
    trackingResult.checkpoints.some(
      (cp) => cp.isDelivered || (cp.status || "").toLowerCase().includes("delivered")
    );

  const isOutForDelivery =
    !isDelivered &&
    (currentStatusText.includes("out for delivery") ||
      currentStatusText.includes("out for del") ||
      trackingResult.checkpoints.some((cp) =>
        (cp.status || "").toLowerCase().includes("out for delivery")
      ));

  const now = new Date();

  // 1. ST Courier reports Delivered
  if (isDelivered) {
    if (currentOrderStatus === "delivered") {
      // Ensure shipment status is also marked delivered if not already
      if (shipment.status !== "delivered") {
        await db.shipments.update({
          where: { id: shipment.id },
          data: {
            status: "delivered",
            delivered_at: shipment.delivered_at || now,
            updated_at: now,
          },
        });
      }
      return {
        synced: false,
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        reason: "Order is already marked as delivered",
      };
    }

    // Only transition from shipped, out_for_delivery, or packed
    if (["shipped", "out_for_delivery", "packed", "processing"].includes(currentOrderStatus)) {
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            order_status: "delivered",
            updatedAt: now,
          },
        });

        await tx.shipments.update({
          where: { id: shipment.id },
          data: {
            status: "delivered",
            delivered_at: now,
            updated_at: now,
          },
        });

        await tx.order_status_history.create({
          data: {
            order_id: order.id,
            status: "delivered",
            note: `Auto-synced: Delivered via ST Courier tracking (AWB: ${cleanAwb})`,
            is_active: true,
          },
        });

        // Release reserved stock hold on delivery (inventory commitment)
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: order.id, is_active: true },
          select: { variantUnitPriceId: true, quantity: true },
        });

        for (const item of orderItems) {
          if (!item.variantUnitPriceId) continue;
          const vupId = BigInt(item.variantUnitPriceId);
          const inv = await tx.inventory.findFirst({
            where: { variantUnitPriceId: vupId, is_active: true },
          });
          if (!inv) continue;
          const reserved = Math.max(0, Number(inv.quantity_reserved) - item.quantity);
          await tx.inventory.update({
            where: { id: BigInt(inv.id) },
            data: { quantity_reserved: reserved },
          });
          await tx.inventoryTransaction.create({
            data: {
              variant_unit_price_id: vupId,
              type: "out" as any,
              quantity: item.quantity,
              note: `SALE: order delivered — auto-synced via ST Courier (AWB: ${cleanAwb})`,
            },
          });
        }
      });

      return {
        synced: true,
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        previousStatus: currentOrderStatus,
        newStatus: "delivered",
      };
    }
  }

  // 2. ST Courier reports Out for Delivery
  if (isOutForDelivery) {
    if (currentOrderStatus === "shipped") {
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            order_status: "out_for_delivery",
            updatedAt: now,
          },
        });

        await tx.shipments.update({
          where: { id: shipment.id },
          data: {
            status: "out_for_delivery",
            updated_at: now,
          },
        });

        await tx.order_status_history.create({
          data: {
            order_id: order.id,
            status: "out_for_delivery",
            note: `Auto-synced: Out for delivery via ST Courier tracking (AWB: ${cleanAwb})`,
            is_active: true,
          },
        });
      });

      return {
        synced: true,
        orderId: String(order.id),
        orderNumber: order.orderNumber,
        previousStatus: currentOrderStatus,
        newStatus: "out_for_delivery",
      };
    }
  }

  return {
    synced: false,
    orderId: String(order.id),
    orderNumber: order.orderNumber,
    reason: `Current tracking status '${trackingResult.summary?.currentStatus || "In Transit"}' requires no state change`,
  };
}

/**
 * Background Cron Job Runner:
 * Queries active shipments where order_status is 'shipped' or 'out_for_delivery'.
 * CRITICAL RULE: NEVER recheck orders that have already reached 'delivered', 'cancelled', or 'returned'.
 */
export async function runSTCourierSyncCronJob(): Promise<{
  timestamp: string;
  totalActiveFound: number;
  updatedToDelivered: number;
  updatedToOutForDelivery: number;
  unchanged: number;
  results: Array<{
    orderNumber: string;
    awb: string;
    status: string;
    syncResult: TrackingSyncResult;
  }>;
}> {
  // Only query orders in active shipment transit.
  // NEVER query 'delivered', 'cancelled', or 'returned'.
  const activeShipments = await db.shipments.findMany({
    where: {
      is_active: true,
      tracking_number: { not: null },
      orders: {
        is_active: true,
        order_status: {
          in: ["shipped", "out_for_delivery"],
        },
      },
    },
    include: {
      orders: true,
    },
    take: 50, // Batch limit per cron run
  });

  const results: Array<{
    orderNumber: string;
    awb: string;
    status: string;
    syncResult: TrackingSyncResult;
  }> = [];

  let updatedToDelivered = 0;
  let updatedToOutForDelivery = 0;
  let unchanged = 0;

  for (let i = 0; i < activeShipments.length; i++) {
    const shipment = activeShipments[i];
    const awb = shipment.tracking_number;
    const orderNumber = shipment.orders?.orderNumber || String(shipment.order_id);

    if (!awb) continue;

    // Rate-limiting pause between requests (2000ms) to prevent IP blocking from ST Courier
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    try {
      const tracking = await fetchSTCourierTracking(awb);
      const sync = await syncOrderStatusFromTrackingResult(
        awb,
        tracking,
        shipment.order_id
      );

      if (sync.synced && sync.newStatus === "delivered") {
        updatedToDelivered++;
      } else if (sync.synced && sync.newStatus === "out_for_delivery") {
        updatedToOutForDelivery++;
      } else {
        unchanged++;
      }

      results.push({
        orderNumber,
        awb,
        status: tracking.summary?.currentStatus || "Unknown",
        syncResult: sync,
      });
    } catch (err: any) {
      console.error(`[Cron Sync Error] Failed checking AWB ${awb}:`, err);
      unchanged++;
      results.push({
        orderNumber,
        awb,
        status: "Error",
        syncResult: {
          synced: false,
          reason: err?.message || "Tracking request failed",
        },
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalActiveFound: activeShipments.length,
    updatedToDelivered,
    updatedToOutForDelivery,
    unchanged,
    results,
  };
}
