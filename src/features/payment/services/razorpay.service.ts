import crypto from "crypto";
import { ApiError } from "@/lib/api/api-error";
import { db } from "@/lib/db/prisma";
import { userRepository } from "@/features/users/repositories/user.repository";
import { cartService } from "@/features/cart/services/cart.service";
import { orderService } from "@/features/orders/services/order.service";
import { getRazorpayClient, getRazorpayPublicKey } from "../config/razorpay.config";
import { paymentRepository } from "../repositories/payment.repository";
import type {
  CreateRazorpayOrderInput,
  VerifyRazorpayPaymentInput,
  RazorpayOrderResponse,
} from "../validations/payment.schema";

export const razorpayService = {
  /**
   * Create a Razorpay Order based on either active Cart or an existing internal order
   */
  async createRazorpayOrder(
    sessionUserId: string,
    input: CreateRazorpayOrderInput
  ): Promise<RazorpayOrderResponse> {
    const user = await userRepository.findById(sessionUserId);
    if (!user || !user.internalId) {
      throw ApiError.unauthorized("User not found");
    }
    if (!user.isActive || user.is_active === false) {
      throw ApiError.forbidden("Your account is inactive. Please contact support.");
    }

    const userId = user.internalId;
    const isCartCheckout = !input.orderId || input.orderId === "cart";

    // A. Cart-First Flow: Create Razorpay Order directly from active cart (No internal order created yet)
    if (isCartCheckout) {
      const cart = await cartService.getCart(sessionUserId);
      if (!cart || cart.items.length === 0) {
        throw ApiError.badRequest("Your cart is empty. Please add items before checking out.");
      }

      // Check real-time stock before creating Razorpay order
      for (const item of cart.items) {
        if (!item.variantUnitPriceId) continue;
        const vup = await db.variantUnitPrice.findFirst({
          where: {
            OR: [
              { uuid: item.variantUnitPriceId },
              ...(isNaN(Number(item.variantUnitPriceId)) ? [] : [{ id: BigInt(item.variantUnitPriceId) }]),
            ],
            deleted_at: null,
          },
          include: {
            variant: true,
            inventories: {
              where: { is_active: true },
              select: { quantity_available: true, quantity_reserved: true },
            },
          },
        });

        if (!vup || !vup.isActive || vup.deleted_at !== null) {
          throw ApiError.badRequest(
            `"${item.productName}" is no longer available. Please remove it from your cart.`
          );
        }

        const variant = vup.variant;
        if (!variant || !variant.isActive || variant.deleted_at !== null || variant.out_of_stock) {
          throw ApiError.badRequest(
            `"${item.productName}" is out of stock. Please remove it from your cart.`
          );
        }

        // If numerical inventory is explicitly tracked and positive, ensure sufficient available stock
        if (vup.inventories && typeof vup.inventories.quantity_available === "number") {
          const rawAvailable = vup.inventories.quantity_available;
          const reserved = vup.inventories.quantity_reserved || 0;
          const effectiveStock = Math.max(0, rawAvailable - reserved);

          if (rawAvailable > 0 && effectiveStock < item.quantity) {
            throw ApiError.badRequest(
              `Only ${effectiveStock} unit${effectiveStock === 1 ? "" : "s"} left for "${item.productName}". Please update your cart.`
            );
          }
        }
      }


      const payableBeforeShipping = cart.total;
      const isExpress = (input.deliveryMethod || "").toLowerCase() === "express";
      const shippingCharge = isExpress ? 99 : payableBeforeShipping >= 499 ? 0 : 49;
      const payableAmount = payableBeforeShipping + shippingCharge;
      if (payableAmount <= 0) {
        throw ApiError.badRequest("Invalid cart payable amount.");
      }

      const amountInPaise = Math.round(payableAmount * 100);
      const razorpay = getRazorpayClient();
      let rzpOrder: any;
      try {
        rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: `CART_${Date.now().toString().slice(-8)}`,
          notes: {
            userId: String(userId),
            checkoutType: "cart",
            shippingAddressId: input.shippingAddressId || "",
            deliveryMethod: input.deliveryMethod || "standard",
          },
        });
      } catch (err: any) {
        const description =
          err?.error?.description ||
          err?.message ||
          "Failed to communicate with Razorpay API";
        console.error("Razorpay orders.create error:", err);
        throw ApiError.badRequest(
          `Razorpay Error: ${description}. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.`
        );
      }

      return {
        razorpayOrderId: rzpOrder.id,
        amount: Number(rzpOrder.amount),
        currency: rzpOrder.currency,
        keyId: getRazorpayPublicKey(),
        orderNumber: "New Order",
        internalOrderId: "cart",
      };
    }

    // B. Existing Order Flow: Used when retrying payment for an already created pending order
    const order = await paymentRepository.findCustomerOrder(userId, input.orderId!);
    if (!order) {
      throw ApiError.notFound("Order not found or does not belong to customer");
    }

    if (order.payment_status === "paid") {
      throw ApiError.badRequest("This order has already been paid for.");
    }

    if (order.order_status === "cancelled") {
      throw ApiError.badRequest("Cannot pay for a cancelled order.");
    }

    const payableAmount = Number(order.totalAmount);
    if (isNaN(payableAmount) || payableAmount <= 0) {
      throw ApiError.badRequest("Invalid order payable amount.");
    }

    const amountInPaise = Math.round(payableAmount * 100);

    // Check for an existing pending payment record with a valid Razorpay Order ID
    const existingPendingPayment = await paymentRepository.findPendingPayment(order.id);
    if (
      existingPendingPayment &&
      existingPendingPayment.gateway_order_id &&
      Number(existingPendingPayment.amount) === payableAmount
    ) {
      return {
        razorpayOrderId: existingPendingPayment.gateway_order_id,
        amount: amountInPaise,
        currency: "INR",
        keyId: getRazorpayPublicKey(),
        orderNumber: order.orderNumber,
        internalOrderId: order.uuid || String(order.id),
      };
    }

    const razorpay = getRazorpayClient();
    let rzpOrder: any;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.orderNumber,
        notes: {
          orderId: String(order.id),
          orderUuid: order.uuid || "",
          orderNumber: order.orderNumber,
          userId: String(userId),
        },
      });
    } catch (err: any) {
      const description =
        err?.error?.description ||
        err?.message ||
        "Failed to communicate with Razorpay API";
      console.error("Razorpay orders.create error:", err);
      throw ApiError.badRequest(
        `Razorpay Error: ${description}. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.`
      );
    }

    const paymentMethod = await paymentRepository.getOrCreatePaymentMethod(
      "RAZORPAY",
      "Razorpay Online Payment"
    );

    await paymentRepository.createPaymentRecord({
      orderId: order.id,
      paymentMethodId: paymentMethod.id,
      amount: payableAmount,
      currency: "INR",
      gatewayOrderId: rzpOrder.id,
      createdBy: userId,
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: Number(rzpOrder.amount),
      currency: rzpOrder.currency,
      keyId: getRazorpayPublicKey(),
      orderNumber: order.orderNumber,
      internalOrderId: order.uuid || String(order.id),
    };
  },

  /**
   * Cryptographically verify Razorpay signature and confirm order on success
   */
  async verifyPaymentSignature(
    sessionUserId: string,
    input: VerifyRazorpayPaymentInput
  ) {
    const user = await userRepository.findById(sessionUserId);
    if (!user || !user.internalId) {
      throw ApiError.unauthorized("User not found");
    }

    const userId = user.internalId;
    const isCartCheckout = !input.orderId || input.orderId === "cart";

    // 1. Cryptographic Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(input.razorpay_signature || "", "utf8");

    const isSignatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isSignatureValid) {
      throw ApiError.badRequest("Invalid payment signature. Verification rejected.");
    }


    // 2. Handle Cart-First Payment Verification:
    // Create the order in the database ONLY NOW, after signature is cryptographically verified!
    if (isCartCheckout) {
      if (!input.shippingAddressId) {
        throw ApiError.badRequest("Shipping address is required to complete the order.");
      }

      let createdOrder;
      try {
        createdOrder = await orderService.createCustomerOrder(sessionUserId, {
          shippingAddressId: input.shippingAddressId,
          billingAddressId: input.billingAddressId || input.shippingAddressId,
          deliveryMethod: input.deliveryMethod || "standard",
          notes: input.notes,
          paymentMethod: "CARD",
          paymentDetails: {
            gateway: "RAZORPAY",
            isPaid: true,
            razorpay_order_id: input.razorpay_order_id,
            razorpay_payment_id: input.razorpay_payment_id,
            razorpay_signature: input.razorpay_signature,
          },
        });
      } catch (orderErr: any) {
        // Stock reservation or order creation failed after payment capture.
        // Automatically refund captured payment immediately so customer is protected.
        try {
          const razorpay = getRazorpayClient();
          await razorpay.payments.refund(input.razorpay_payment_id, {
            notes: {
              reason: "Stock unavailable during checkout; automatic full refund initiated",
              razorpay_order_id: input.razorpay_order_id,
            },
          });
          console.warn(
            `[Razorpay] Auto-refunded payment ${input.razorpay_payment_id} due to order placement failure: ${orderErr?.message}`
          );
        } catch (refundErr: any) {
          console.error(
            `[Razorpay] CRITICAL: Auto-refund failed for payment ${input.razorpay_payment_id}:`,
            refundErr
          );
        }

        const baseMsg = orderErr?.message || "Could not complete order due to stock unavailability.";
        throw ApiError.badRequest(
          `${baseMsg} A full refund has been automatically initiated to your payment method.`
        );
      }

      // Find the created order to retrieve internal BigInt ID
      const dbOrder = await db.order.findFirst({
        where: {
          OR: [
            { uuid: createdOrder.id },
            { orderNumber: createdOrder.orderNumber },
          ],
        },
        select: { id: true, uuid: true, orderNumber: true, totalAmount: true },
      });

      if (dbOrder) {
        const paymentMethod = await paymentRepository.getOrCreatePaymentMethod(
          "RAZORPAY",
          "Razorpay Online Payment"
        );

        const paymentRecord = await paymentRepository.createPaymentRecord({
          orderId: dbOrder.id,
          paymentMethodId: paymentMethod.id,
          amount: Number(dbOrder.totalAmount),
          currency: "INR",
          gatewayOrderId: input.razorpay_order_id,
          createdBy: userId,
        });

        await paymentRepository.recordPaymentSuccess({
          paymentId: paymentRecord.id,
          orderId: dbOrder.id,
          userId,
          razorpayPaymentId: input.razorpay_payment_id,
          gatewayResponse: {
            razorpay_order_id: input.razorpay_order_id,
            razorpay_payment_id: input.razorpay_payment_id,
            razorpay_signature: input.razorpay_signature,
          },
          amount: Number(dbOrder.totalAmount),
        });
      }

      return {
        success: true,
        message: "Payment verified and order placed successfully",
        orderNumber: createdOrder.orderNumber,
        orderId: createdOrder.id,
      };
    }

    // 3. Handle Existing Order Verification
    const order = await paymentRepository.findCustomerOrder(userId, input.orderId!);
    if (!order) {
      throw ApiError.notFound("Order not found or does not belong to customer");
    }

    const payment = await paymentRepository.findPendingPayment(
      order.id,
      input.razorpay_order_id
    );

    if (!payment) {
      throw ApiError.notFound("Matching payment record not found for this order");
    }

    if (payment.status === "success" && order.payment_status === "paid") {
      return {
        success: true,
        message: "Payment already verified",
        orderNumber: order.orderNumber,
        orderId: order.uuid || String(order.id),
      };
    }

    const result = await paymentRepository.recordPaymentSuccess({
      paymentId: payment.id,
      orderId: order.id,
      userId,
      razorpayPaymentId: input.razorpay_payment_id,
      gatewayResponse: {
        razorpay_order_id: input.razorpay_order_id,
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
      },
      amount: Number(order.totalAmount),
    });

    return {
      success: true,
      message: "Payment verified successfully",
      orderNumber: result.order.orderNumber,
      orderId: result.order.uuid || String(result.order.id),
    };
  },

  /**
   * Handle server-to-server Razorpay webhooks idempotently
   */
  async handleWebhook(rawBody: string, signatureHeader: string | null) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
    }

    if (!signatureHeader) {
      throw ApiError.badRequest("Missing Razorpay webhook signature header");
    }

    // 1. Verify webhook signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signatureHeader || "", "utf8");

    const isSignatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isSignatureValid) {
      throw ApiError.badRequest("Invalid webhook signature");
    }


    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventType = event.event as string;

    // Handle payment captured or order paid events
    if (eventType === "order.paid" || eventType === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const gatewayPaymentId = paymentEntity?.id;

      if (!gatewayOrderId) {
        return { received: true, ignored: "No gateway order id found in event" };
      }

      // Find local payment record
      const paymentRecord = await paymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
      if (!paymentRecord) {
        return { received: true, ignored: "Payment record not found locally" };
      }

      // Idempotency: if already success, do not double-process
      if (paymentRecord.status === "success" && paymentRecord.order.payment_status === "paid") {
        return { received: true, duplicate: true };
      }

      const order = paymentRecord.order;
      await paymentRepository.recordPaymentSuccess({
        paymentId: paymentRecord.id,
        orderId: order.id,
        userId: order.userId,
        razorpayPaymentId: gatewayPaymentId || "webhook_captured",
        gatewayResponse: event,
        amount: Number(order.totalAmount),
      });

      return { received: true, processed: true };
    }

    if (eventType === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id;
      const errorDescription =
        paymentEntity?.error_description || "Payment failed via webhook notification";

      if (gatewayOrderId) {
        const paymentRecord = await paymentRepository.findPaymentByGatewayOrderId(gatewayOrderId);
        if (paymentRecord && paymentRecord.status !== "success") {
          await paymentRepository.recordPaymentFailure({
            paymentId: paymentRecord.id,
            orderId: paymentRecord.order.id,
            userId: paymentRecord.order.userId,
            errorReason: errorDescription,
            gatewayResponse: event,
            amount: Number(paymentRecord.order.totalAmount),
          });
        }
      }

      return { received: true, processed: true };
    }

    return { received: true, unhandledEvent: eventType };
  },

  /**
   * Refund an existing captured Razorpay payment
   */
  async refundPayment(params: {
    orderId: bigint;
    amount?: number;
    reason?: string;
  }) {
    const successPayment = await db.payment.findFirst({
      where: {
        orderId: params.orderId,
        status: "success",
        gateway: "RAZORPAY",
        is_active: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!successPayment || !successPayment.gateway_payment_id) {
      throw ApiError.badRequest("No captured Razorpay payment found for this order to refund.");
    }

    const refundAmountInPaise = params.amount
      ? Math.round(params.amount * 100)
      : Math.round(Number(successPayment.amount) * 100);

    const razorpay = getRazorpayClient();
    const refund = await razorpay.payments.refund(successPayment.gateway_payment_id, {
      amount: refundAmountInPaise,
      notes: {
        orderId: String(params.orderId),
        reason: params.reason || "Order cancellation refund",
      },
    });

    const isPartial = params.amount
      ? Math.round(params.amount * 100) < Math.round(Number(successPayment.amount) * 100)
      : false;

    // Record refund transaction
    await db.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          paymentId: successPayment.id,
          transaction_type: "refund",
          amount: refundAmountInPaise / 100,
          status: "refunded",
          gatewayResponse: refund as any,
          created_by: successPayment.created_by,
          updated_by: successPayment.updated_by,
        },
      });

      await tx.refunds.create({
        data: {
          order_id: params.orderId,
          payment_id: successPayment.id,
          amount: refundAmountInPaise / 100,
          reason: params.reason || "Refund processed by admin",
          status: "completed",
          processed_at: new Date(),
          created_by: successPayment.created_by,
          updated_by: successPayment.updated_by,
        },
      });

      await tx.payment.update({
        where: { id: successPayment.id },
        data: {
          status: isPartial ? "success" : "refunded",
        },
      });

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          payment_status: isPartial ? "partial_refund" : "refunded",
        },
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refundAmountInPaise / 100,
        isPartial,
      };
    });
  },
};

export default razorpayService;


