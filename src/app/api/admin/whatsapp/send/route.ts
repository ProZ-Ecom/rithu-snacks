import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/whatsapp-client";
import { validateWhatsAppPhone } from "@/lib/whatsapp/whatsapp-utils";
import { apiSuccess, apiError } from "@/lib/api/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body || {};

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return apiError("Recipient phone number is required", 400);
    }

    const validation = validateWhatsAppPhone(phone);
    if (!validation.isValid) {
      return apiError(
        validation.errorMessage || "Invalid recipient phone number. Please enter a valid 10-digit mobile number.",
        400
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return apiError("Message text is required", 400);
    }

    const result = await sendWhatsAppMessage(phone.trim(), message.trim());

    if (!result.success) {
      return apiError(result.error || "Failed to deliver WhatsApp message", 400);
    }

    return apiSuccess(result, "WhatsApp message sent successfully");
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
