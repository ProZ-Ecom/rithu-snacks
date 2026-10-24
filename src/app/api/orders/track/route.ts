import { NextRequest, NextResponse } from "next/server";
import { fetchSTCourierTracking } from "@/features/orders/services/courier-tracking.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const awb = searchParams.get("awb")?.trim();

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB / Tracking number is required" },
        { status: 400 }
      );
    }

    // Fetch tracking from ST Courier
    const result = await fetchSTCourierTracking(awb);

    // Hybrid JIT (Just-in-Time) auto-sync:
    // When live tracking succeeds, automatically synchronize DB order & shipment statuses if needed
    if (result.success) {
      try {
        const { syncOrderStatusFromTrackingResult } = await import(
          "@/features/orders/services/order-tracking-sync.service"
        );
        await syncOrderStatusFromTrackingResult(awb, result);
      } catch (syncErr) {
        console.error("JIT tracking auto-sync error:", syncErr);
      }
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        // Cache for 60s on client to avoid unnecessary refetches
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error: any) {
    console.error("Live tracking API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch live tracking details",
      },
      { status: 500 }
    );
  }
}
