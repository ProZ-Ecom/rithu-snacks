import { db } from "@/lib/db/prisma";
import { getRazorpayClient } from "../config/razorpay.config";

export interface RazorpaySettlement {
  id: string;
  amount: number;
  status: string;
  fees: number;
  tax: number;
  utr: string | null;
  created_at: number;
  settled_on: number | null;
}

export interface RazorpayPaymentItem {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  email: string | null;
  contact: string | null;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
}

export interface RazorpayRefundItem {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  notes: Record<string, any> | null;
  receipt: string | null;
  acquirer_data: Record<string, any> | null;
  created_at: number;
  status: string;
}

export interface SettlementSummary {
  totalSettled: number;
  totalFees: number;
  totalTax: number;
  netReceived: number;
  settlementCount: number;
  lastSettledOn: string | null;
}

export interface PaymentSummary {
  totalCollected: number;
  totalRefunded: number;
  successCount: number;
  failedCount: number;
  capturedCount: number;
  pendingSettlement: number;
}

export interface LocalPaymentSummary {
  totalRevenue: number;
  totalRefunds: number;
  successCount: number;
  failedCount: number;
  refundCount: number;
  avgOrderValue: number;
}

export interface RazorpayDashboardData {
  settlements: RazorpaySettlement[];
  settlementSummary: SettlementSummary;
  recentPayments: RazorpayPaymentItem[];
  paymentSummary: PaymentSummary;
  recentRefunds: RazorpayRefundItem[];
  localSummary: LocalPaymentSummary;
  fetchedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paiseToRupees(paise: number | null | undefined): number {
  if (!paise) return 0;
  return Math.round(paise) / 100;
}

function unixToIso(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

function getUnixRange(days: number): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  return { from, to };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const razorpaySettlementsService = {
  /**
   * Fetch all Settlements from Razorpay API (last N days)
   */
  async fetchSettlements(days = 90): Promise<RazorpaySettlement[]> {
    try {
      const razorpay = getRazorpayClient();
      const { from, to } = getUnixRange(days);
      const response = await (razorpay.settlements as any).all({
        from,
        to,
        count: 100,
      });
      return (response?.items || []) as RazorpaySettlement[];
    } catch (err: any) {
      console.error(
        "[Razorpay] fetchSettlements error:",
        err?.error?.description || err?.message
      );
      return [];
    }
  },

  /**
   * Fetch recent Payments from Razorpay API (last N days)
   */
  async fetchPayments(days = 30, count = 100): Promise<RazorpayPaymentItem[]> {
    try {
      const razorpay = getRazorpayClient();
      const { from, to } = getUnixRange(days);
      const response = await razorpay.payments.all({ from, to, count } as any);
      return (response?.items || []) as RazorpayPaymentItem[];
    } catch (err: any) {
      console.error(
        "[Razorpay] fetchPayments error:",
        err?.error?.description || err?.message
      );
      return [];
    }
  },

  /**
   * Fetch recent Refunds from Razorpay API (last N days)
   */
  async fetchRefunds(days = 30, count = 100): Promise<RazorpayRefundItem[]> {
    try {
      const razorpay = getRazorpayClient();
      const { from, to } = getUnixRange(days);
      const response = await razorpay.refunds.all({ from, to, count } as any);
      return (response?.items || []) as RazorpayRefundItem[];
    } catch (err: any) {
      console.error(
        "[Razorpay] fetchRefunds error:",
        err?.error?.description || err?.message
      );
      return [];
    }
  },

  /**
   * Fetch local payment summary from our DB for cross-validation
   */
  async fetchLocalSummary(): Promise<LocalPaymentSummary> {
    try {
      const [successPayments, failedPayments, refunds] = await Promise.all([
        db.payment.aggregate({
          where: { status: "success", is_active: true, gateway: "RAZORPAY" },
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),
        db.payment.count({
          where: { status: "failed", is_active: true, gateway: "RAZORPAY" },
        }),
        db.refunds.aggregate({
          where: { status: "completed" },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      return {
        totalRevenue: Number(successPayments._sum.amount || 0),
        totalRefunds: Number(refunds._sum.amount || 0),
        successCount: successPayments._count.id,
        failedCount: failedPayments,
        refundCount: refunds._count.id,
        avgOrderValue: Number(successPayments._avg.amount || 0),
      };
    } catch (err) {
      console.error("[Razorpay] fetchLocalSummary error:", err);
      return {
        totalRevenue: 0,
        totalRefunds: 0,
        successCount: 0,
        failedCount: 0,
        refundCount: 0,
        avgOrderValue: 0,
      };
    }
  },

  /**
   * Compute Settlement Summary from raw list
   */
  buildSettlementSummary(settlements: RazorpaySettlement[]): SettlementSummary {
    let totalSettledPaise = 0;
    let totalFeesPaise = 0;
    let totalTaxPaise = 0;
    let lastSettledTs: number | null = null;

    for (const s of settlements) {
      totalSettledPaise += s.amount || 0;
      totalFeesPaise += s.fees || 0;
      totalTaxPaise += s.tax || 0;
      if (!lastSettledTs || (s.settled_on && s.settled_on > lastSettledTs)) {
        lastSettledTs = s.settled_on;
      }
    }

    const totalSettled = paiseToRupees(totalSettledPaise);
    const totalFees = paiseToRupees(totalFeesPaise);
    const totalTax = paiseToRupees(totalTaxPaise);

    return {
      totalSettled,
      totalFees,
      totalTax,
      netReceived: Math.round((totalSettled - totalFees - totalTax) * 100) / 100,
      settlementCount: settlements.length,
      lastSettledOn: unixToIso(lastSettledTs),
    };
  },

  /**
   * Compute Payment Summary from raw payments + refunds
   */
  buildPaymentSummary(
    payments: RazorpayPaymentItem[],
    refunds: RazorpayRefundItem[],
    settlementSummary: SettlementSummary
  ): PaymentSummary {
    let totalCollectedPaise = 0;
    let totalRefundedPaise = 0;
    let successCount = 0;
    let failedCount = 0;
    let capturedCount = 0;

    for (const p of payments) {
      if (p.status === "captured") {
        totalCollectedPaise += p.amount || 0;
        capturedCount++;
        successCount++;
      } else if (p.status === "authorized") {
        successCount++;
      } else if (p.status === "failed") {
        failedCount++;
      }
      totalRefundedPaise += p.amount_refunded || 0;
    }

    const refundTotal = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCollected = paiseToRupees(totalCollectedPaise);
    const totalRefunded = paiseToRupees(Math.max(totalRefundedPaise, refundTotal));

    return {
      totalCollected,
      totalRefunded,
      successCount,
      failedCount,
      capturedCount,
      pendingSettlement: Math.max(
        0,
        Math.round((totalCollected - totalRefunded - settlementSummary.totalSettled) * 100) / 100
      ),
    };
  },

  /**
   * Combine everything for admin dashboard
   */
  async getDashboardData(days = 30): Promise<RazorpayDashboardData> {
    const [settlements, payments, refunds, localSummary] = await Promise.all([
      this.fetchSettlements(90),
      this.fetchPayments(days, 100),
      this.fetchRefunds(days, 100),
      this.fetchLocalSummary(),
    ]);

    const settlementSummary = this.buildSettlementSummary(settlements);
    const paymentSummary = this.buildPaymentSummary(payments, refunds, settlementSummary);

    return {
      settlements: settlements.slice(0, 50),
      settlementSummary,
      recentPayments: payments.slice(0, 50),
      paymentSummary,
      recentRefunds: refunds.slice(0, 20),
      localSummary,
      fetchedAt: new Date().toISOString(),
    };
  },
};
