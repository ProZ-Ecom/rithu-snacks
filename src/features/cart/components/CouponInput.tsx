"use client";

import { useState } from "react";
import { Tag, Check, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/utils";
import {
  useApplyCouponMutation,
  useRemoveCouponMutation,
} from "@/features/customers/hooks/use-customer-cart";
import type { CartResponse } from "@/features/cart/types/cart.types";

interface CouponInputProps {
  appliedCoupon?: CartResponse["coupon"];
  couponDiscount?: number;
  className?: string;
}

export function CouponInput({
  appliedCoupon,
  couponDiscount = 0,
  className = "",
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const applyCouponMutation = useApplyCouponMutation();
  const removeCouponMutation = useRemoveCouponMutation();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Invalid Code", "Please enter a valid coupon code.");
      return;
    }

    try {
      const res = await applyCouponMutation.mutateAsync(cleanCode);
      const discount = res.couponDiscount || res.coupon?.discountAmount || 0;
      toast.success(
        "Coupon Applied! 🎉",
        `"${cleanCode}" applied successfully! You saved ${formatPrice(discount)}.`
      );
      setCode("");
    } catch (err: any) {
      toast.error("Could Not Apply Coupon", err?.message || "Invalid coupon code");
    }
  };

  const handleRemove = async () => {
    try {
      await removeCouponMutation.mutateAsync();
      toast.info("Coupon Removed", "The coupon discount has been removed from your cart.");
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to remove coupon");
    }
  };

  // If coupon is already applied, show the applied badge card
  if (appliedCoupon) {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3 shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-700 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-emerald-900 tracking-wider">
                {appliedCoupon.code}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-800">
                APPLIED
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">
              Saving {formatPrice(couponDiscount || appliedCoupon.discountAmount)} on this order
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={removeCouponMutation.isPending}
          className="h-8 w-8 p-0 text-emerald-700 hover:text-rose-600 hover:bg-emerald-100/80 rounded-lg cursor-pointer shrink-0"
          title="Remove coupon"
        >
          {removeCouponMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // Otherwise, show input form
  return (
    <form onSubmit={handleApply} className={`space-y-1.5 ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-theme-text-muted pointer-events-none">
          <Tag className="h-3.5 w-3.5 text-theme-primary/70" />
        </div>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          maxLength={30}
          disabled={applyCouponMutation.isPending}
          className="w-full min-h-[42px] rounded-xl border border-theme-border-input bg-white pl-9 pr-20 text-xs font-mono font-semibold uppercase text-theme-text-primary placeholder:text-theme-text-muted placeholder:font-sans placeholder:font-normal focus:border-theme-primary focus:outline-none transition-colors"
        />
        <Button
          type="submit"
          disabled={applyCouponMutation.isPending || !code.trim()}
          className="absolute right-1.5 h-8 px-3 rounded-lg bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {applyCouponMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </form>
  );
}
