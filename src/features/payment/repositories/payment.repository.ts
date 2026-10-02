import { db } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Format a JS Date as a MySQL-compatible UTC datetime string (YYYY-MM-DD HH:MM:SS).
 * This avoids MySQL interpreting the value as local time when the server timezone
 * differs from UTC (e.g. IST = UTC+5:30 would shift the time by 5.5 hours).
 */
function toUtcDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export const paymentRepository = {
  /**
   * Get or create a payment method row (e.g. RAZORPAY, COD)
   */
  async getOrCreatePaymentMethod(code: string, name: string) {
    let method = await db.payment_methods.findUnique({
      where: { code },
    });

    if (!method) {
      method = await db.payment_methods.create({
        data: {
          name,
          code,
          is_active: true,
        },
      });
    }

    return method;
  },

  /**
   * Find an order by internal UUID, OrderNumber, or numeric ID belonging to a specific customer
   */
  async findCustomerOrder(userId: bigint, orderRef: string) {
    const isNumeric = /^\d+$/.test(orderRef);
    const order = await db.order.findFirst({
      where: {
        userId,
        is_active: true,
        OR: [
          { uuid: orderRef },
          { orderNumber: orderRef },
          ...(isNumeric ? [{ id: BigInt(orderRef) }] : []),
        ],
      },
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
        payments: {
          where: { is_active: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return order;
  },

  /**
   * Find an order globally by gateway order id (used by webhooks)
   */
  async findPaymentByGatewayOrderId(gatewayOrderId: string) {
    return db.payment.findFirst({
      where: {
        gateway_order_id: gatewayOrderId,
        is_active: true,
      },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });
  },

  /**
   * Check if an active pending payment record exists for this order & gateway order id
   */
  async findPendingPayment(orderId: bigint, gatewayOrderId?: string) {
    return db.payment.findFirst({
      where: {
        orderId,
        is_active: true,
        ...(gatewayOrderId ? { gateway_order_id: gatewayOrderId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Create an initial Payment record for a Razorpay order
   */
  async createPaymentRecord(params: {
    orderId: bigint;
    paymentMethodId: bigint;
    amount: number;
    currency?: string;
    gatewayOrderId: string;
    createdBy?: bigint;
  }) {
    return db.payment.create({
      data: {
        orderId: params.orderId,
        payment_method_id: params.paymentMethodId,
        amount: params.amount,
        currency: params.currency || "INR",
        status: "pending",
        gateway: "RAZORPAY",
        gateway_order_id: params.gatewayOrderId,
        created_by: params.createdBy ?? params.orderId,
        updated_by: params.createdBy ?? params.orderId,
      },
    });
  },

  /**
   * Complete payment verification and confirm order transactionally
   */
  async recordPaymentSuccess(params: {
    paymentId: bigint;
    orderId: bigint;
    userId: bigint;
    razorpayPaymentId: string;
    gatewayResponse: Record<string, unknown>;
    amount: number;
  }) {
    return db.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update Payment status to success
      const updatedPayment = await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: "success",
          gateway_payment_id: params.razorpayPaymentId,
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      // 2. Create PaymentTransaction audit record
      await tx.paymentTransaction.create({
        data: {
          paymentId: params.paymentId,
          transaction_type: "charge",
          amount: params.amount,
          status: "captured",
          gatewayResponse: params.gatewayResponse as Prisma.InputJsonValue,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });

      // 3. Update Order to paid and confirmed
      const updatedOrder = await tx.order.update({
        where: { id: params.orderId },
        data: {
          payment_status: "paid",
          order_status: "confirmed",
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      // 4. Create Order Status History
      await tx.order_status_history.create({
        data: {
          order_id: params.orderId,
          status: "confirmed",
          note: `Payment captured successfully via Razorpay (Payment ID: ${params.razorpayPaymentId})`,
          changed_by: params.userId,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });

      return {
        payment: updatedPayment,
        order: updatedOrder,
      };
    });
  },

  /**
   * Record payment failure
   */
  async recordPaymentFailure(params: {
    paymentId: bigint;
    orderId: bigint;
    userId?: bigint;
    errorReason: string;
    gatewayResponse?: Record<string, unknown>;
    amount: number;
  }) {
    return db.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update Payment status to failed
      await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: "failed",
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      // 2. Create PaymentTransaction audit entry
      await tx.paymentTransaction.create({
        data: {
          paymentId: params.paymentId,
          transaction_type: "charge",
          amount: params.amount,
          status: "failed",
          gatewayResponse: (params.gatewayResponse || { error: params.errorReason }) as Prisma.InputJsonValue,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });

      // 3. Keep order as payment_status failed but order remains pending/open for retry
      await tx.order.update({
        where: { id: params.orderId },
        data: {
          payment_status: "failed",
          updatedAt: now,
          updated_by: params.userId,
        },
      });

      // 4. Append to status history
      await tx.order_status_history.create({
        data: {
          order_id: params.orderId,
          status: "pending",
          note: `Razorpay payment failed: ${params.errorReason}`,
          changed_by: params.userId,
          created_by: params.userId,
          updated_by: params.userId,
        },
      });
    });
  },
};

export default paymentRepository;


