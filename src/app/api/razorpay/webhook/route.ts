import { NextRequest, NextResponse } from "next/server";
import { razorpayService } from "@/features/payment/services/razorpay.service";

/**
 * POST /api/razorpay/webhook
 * Handles incoming Razorpay webhook events (payment.captured, order.paid, payment.failed, refund.processed).
 * Uses cryptographic HMAC-SHA256 signature verification on the raw request body.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const result = await razorpayService.handleWebhook(rawBody, signature);
    return NextResponse.json({ status: "ok", result }, { status: 200 });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error?.message || error);
    const statusCode = error?.statusCode || 400;
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed" },
      { status: statusCode }
    );
  }
}
