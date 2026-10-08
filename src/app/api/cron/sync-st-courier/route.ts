import { NextRequest, NextResponse } from "next/server";
import { runSTCourierSyncCronJob } from "@/features/orders/services/order-tracking-sync.service";
import { auth } from "@/lib/auth";

async function handleSync(request: NextRequest) {
  try {
    // 1. Authorization check
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get("key");

    let isAuthorized = false;

    // Check CRON_SECRET if configured in environment
    if (cronSecret) {
      if (
        authHeader === `Bearer ${cronSecret}` ||
        keyParam === cronSecret
      ) {
        isAuthorized = true;
      }
    } else {
      // In development / local testing without CRON_SECRET configured
      isAuthorized = true;
    }

    // Also authorize if active Admin session is present
    if (!isAuthorized) {
      const session = await auth();
      const userRole = (session?.user as any)?.role;
      if (userRole === "ADMIN" || userRole === "STAFF") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized cron trigger" },
        { status: 401 }
      );
    }

    // 2. Run ST Courier sync
    // CRITICAL: runSTCourierSyncCronJob() ONLY queries orders where status is 'shipped' or 'out_for_delivery'
    // It NEVER rechecks orders that have already reached 'delivered', 'cancelled', or 'returned'.
    const syncSummary = await runSTCourierSyncCronJob();

    return NextResponse.json({
      success: true,
      message: "ST Courier background sync completed successfully",
      ...syncSummary,
    });
  } catch (error: any) {
    console.error("Cron sync ST Courier error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed running ST Courier tracking sync cron",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
