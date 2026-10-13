"use client";

import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { CouponInput } from "./CouponInput";
import type { CartSummaryType } from "../types";

interface CartSummaryProps {
  summary: CartSummaryType;
  onCheckout?: () => void;
  isCheckingOut?: boolean;
}

function CartSummary({
  summary,
  onCheckout,
  isCheckingOut = false,
}: CartSummaryProps) {
  const freeShippingThreshold = 499;
  const subtotal = Number(summary.subtotal || 0);
  const remainingForFreeShipping = Math.max(
    0,
    freeShippingThreshold - subtotal
  );
  const progressPercent = Math.min(
    100,
    Math.round((subtotal / freeShippingThreshold) * 100)
  );

  return (
    <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-theme-border-subtle bg-theme-surface-alt px-5 py-4">
        <h2 className="text-base font-bold text-theme-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-theme-secondary" />
          Order Summary
        </h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Free Shipping Progress */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-surface-alt p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-theme-primary">
              <Truck className="h-3.5 w-3.5 text-theme-secondary" />
              {remainingForFreeShipping > 0
                ? `Add ${formatPrice(remainingForFreeShipping)} more for FREE delivery`
                : "You unlocked FREE Standard Delivery!"}
            </span>
            <span className="text-theme-text-muted font-semibold">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-theme-border">
            <div
              className="h-full rounded-full bg-theme-secondary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Promo / Coupon Input */}
        <div className="pt-1">
          <CouponInput
            appliedCoupon={summary.coupon}
            couponDiscount={summary.couponDiscount}
          />
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-theme-text-subtle">
              Subtotal ({summary.totalItems} {summary.totalItems === 1 ? "item" : "items"})
            </span>
            <span className="font-semibold text-theme-text-primary">
              {formatPrice(summary.subtotal)}
            </span>
          </div>

          {Boolean(summary.couponDiscount && summary.couponDiscount > 0) && (
            <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Coupon ({summary.coupon?.code})</span>
              </span>
              <span>-{formatPrice(summary.couponDiscount || 0)}</span>
            </div>
          )}

          {/* {summary.discount > 0 && (
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Total Savings</span>
              </span>
              <span>You save {formatPrice(summary.discount)}</span>
            </div>
          )} */}

          {summary.tax > 0 && (
            <div className="flex justify-between text-theme-text-subtle">
              <span>Taxes & GST</span>
              <span className="font-medium">{formatPrice(summary.tax)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-theme-text-subtle">Delivery Charges</span>
            {summary.shippingCharge === 0 || remainingForFreeShipping === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-theme-status-del-bg text-theme-status-del-fg font-bold text-xs">
                FREE
              </span>
            ) : (
              <span className="font-semibold text-theme-text-primary">
                {formatPrice(summary.shippingCharge)}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-theme-border-subtle" />

        {/* Grand Total */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-base font-bold text-theme-text-primary">Grand Total</div>
            <div className="text-xs text-theme-text-muted">
              Inclusive of all taxes
            </div>
          </div>
          <div className="text-2xl font-extrabold text-theme-primary">
            {formatPrice(summary.grandTotal)}
          </div>
        </div>

        {/* Checkout CTA */}
        {onCheckout && (
          <Button
            type="button"
            className="w-full h-12 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-theme-primary-fg font-bold text-sm shadow-sm transition-all hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            onClick={onCheckout}
            disabled={isCheckingOut || summary.totalItems === 0}
          >
            <span>
              {isCheckingOut ? "Preparing Order..." : "Proceed to Checkout"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {/* Trust & Guarantee Badges */}
        <div className="pt-2 space-y-2 border-t border-theme-border-subtle">
          <div className="flex items-center gap-2 text-xs text-theme-text-subtle">
            <ShieldCheck className="h-4 w-4 text-theme-status-del-fg shrink-0" />
            <span>100% Authentic Homemade Snacks</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-theme-text-subtle">
            <Lock className="h-4 w-4 text-theme-status-out-fg shrink-0" />
            <span>Encrypted 256-bit Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CartSummary };

