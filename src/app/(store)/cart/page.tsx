"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/Toast";
import { CartItem } from "@/features/cart/components/CartItem";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { CartEmpty } from "@/features/cart/components/CartEmpty";
import {
  useCustomerCart,
  useUpdateCartQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} from "@/features/customers/hooks/use-customer-cart";

function CartPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl animate-pulse">
      {/* Title & subtitle skeleton */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-96 rounded-lg skeleton-shimmer" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left items column skeleton */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
            >
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl skeleton-shimmer shrink-0" />
              <div className="flex-1 w-full space-y-2.5">
                <div className="h-5 w-48 rounded-md skeleton-shimmer" />
                <div className="h-4 w-32 rounded-md skeleton-shimmer" />
                <div className="h-4 w-24 rounded-md skeleton-shimmer" />
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0">
                <div className="h-6 w-20 rounded-md skeleton-shimmer" />
                <div className="h-8 w-28 rounded-xl skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Right summary skeleton */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5 space-y-4">
            <div className="h-6 w-36 rounded-md skeleton-shimmer" />
            <div className="h-12 rounded-xl skeleton-shimmer" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full rounded-md skeleton-shimmer" />
              <div className="h-4 w-full rounded-md skeleton-shimmer" />
              <div className="h-4 w-full rounded-md skeleton-shimmer" />
            </div>
            <div className="h-10 w-full rounded-xl skeleton-shimmer pt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{
    variantUuid: string;
    productName: string;
    variantName?: string;
  } | null>(null);
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);

  const {
    data: cart,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCustomerCart();

  const updateQuantityMutation = useUpdateCartQuantityMutation();
  const removeItemMutation = useRemoveCartItemMutation();
  const clearCartMutation = useClearCartMutation();

  if (status === "loading" || (isLoading && !cart)) {
    return <CartPageSkeleton />;
  }

  if (status === "unauthenticated" || !session) {
    router.push("/login?callbackUrl=/cart");
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <div className="rounded-2xl border border-theme-border-accent bg-theme-surface-warm p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-theme-secondary-light text-theme-status-can-fg">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-theme-text-primary mb-2">
            Unable to Load Cart
          </h2>
          <p className="text-sm text-theme-text-subtle mb-6">
            We encountered an issue fetching your cart. Please try again.
          </p>
          <Button
            onClick={() => refetch()}
            className="h-10 px-6 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-theme-primary-fg font-semibold text-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const totalItemsCount = Number(
    cart?.totalItems ??
      items.reduce(
        (sum: number, it: any) => sum + Math.max(1, Number(it.quantity || 1)),
        0
      )
  );

  const subtotal = Number(
    cart?.subtotal ??
      cart?.total ??
      items.reduce((sum: number, it: any) => {
        const qty = Math.max(1, Number(it.quantity || 1));
        const price = Number(
          it.price ??
            it.currentPrice ??
            it.salePrice ??
            (it.itemTotal ? Number(it.itemTotal) / qty : it.priceAtAdd ?? it.basePrice ?? 0)
        );
        return sum + (it.itemTotal != null ? Number(it.itemTotal) : price * qty);
      }, 0)
  );

  const totalDiscount = Number(cart?.totalDiscount ?? cart?.totalSavings ?? 0);
  const couponDiscount = Number(cart?.couponDiscount || cart?.coupon?.discountAmount || 0);
  const originalSubtotal = Number(cart?.originalSubtotal ?? (subtotal + totalDiscount));

  const freeDeliveryThreshold = 499;
  const payableItemsTotal = Number(cart?.total ?? Math.max(0, subtotal - couponDiscount));
  const isFreeDelivery = payableItemsTotal >= freeDeliveryThreshold || payableItemsTotal === 0;
  const shippingCharge = isFreeDelivery ? 0 : 49;
  const grandTotal = payableItemsTotal + shippingCharge;

  const summary = {
    subtotal,
    originalSubtotal,
    discount: totalDiscount,
    couponDiscount,
    coupon: cart?.coupon ?? null,
    tax: 0,
    shippingCharge,
    grandTotal,
    totalItems: totalItemsCount,
  };

  const handleUpdateQuantity = (variantUuid: string, quantity: number) => {
    updateQuantityMutation.mutate({ variantUuid, quantity });
  };

  const handleRequestRemoveItem = (item: any) => {
    const variantUuid =
      typeof item === "string"
        ? item
        : item.variantId || item.variantUuid || item.id;
    const productName =
      typeof item === "string"
        ? "this item"
        : item.productName || item.product?.name || "Traditional Snack";
    const variantName =
      typeof item === "string"
        ? undefined
        : item.variantName || item.variant?.name || undefined;

    setItemToRemove({
      variantUuid,
      productName,
      variantName,
    });
  };

  const handleConfirmRemoveItem = () => {
    if (!itemToRemove) return;
    const { variantUuid, productName } = itemToRemove;

    removeItemMutation.mutate(variantUuid, {
      onSuccess: () => {
        toast.success(
          "Item removed",
          `"${productName}" has been removed from your cart.`
        );
        setItemToRemove(null);
      },
      onError: (err: any) => {
        toast.error(
          "Failed to remove item",
          err?.message || "Something went wrong. Please try again."
        );
        setItemToRemove(null);
      },
    });
  };

  const handleRequestClearCart = () => {
    setIsClearCartOpen(true);
  };

  const handleConfirmClearCart = () => {
    clearCartMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Cart cleared", "All items have been removed from your cart.");
        setIsClearCartOpen(false);
      },
      onError: (err: any) => {
        toast.error(
          "Failed to clear cart",
          err?.message || "Something went wrong. Please try again."
        );
        setIsClearCartOpen(false);
      },
    });
  };

  const handleCheckout = () => {
    setIsCheckingOut(true);
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-theme-text-subtle hover:text-theme-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Snacks
          </Link>
        </div>
        <CartEmpty />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-surface-alt border border-theme-border text-theme-primary">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text-primary">
              Shopping Cart
            </h1>
            <span className="rounded-full bg-theme-status-out-bg px-2.5 py-0.5 text-xs font-bold text-theme-status-out-fg border border-theme-border-accent">
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-theme-text-subtle">
            Freshly prepared traditional South Indian delicacies ready for doorstep delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-theme-primary hover:text-theme-primary-hover bg-theme-surface border border-theme-border px-3.5 py-2 rounded-xl transition-all hover:bg-theme-surface-alt"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Add More Snacks
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRequestClearCart}
            disabled={clearCartMutation.isPending || items.length === 0}
            className="text-xs text-theme-text-muted hover:text-theme-status-can-fg hover:bg-theme-status-can-bg rounded-xl cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear Cart
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Item Cards List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItem
              key={item.id || item.variantId || item.productId}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRequestRemoveItem}
              isUpdating={
                updateQuantityMutation.isPending &&
                updateQuantityMutation.variables?.variantUuid ===
                  (item.variantId || item.id)
              }
              isRemoving={
                removeItemMutation.isPending &&
                removeItemMutation.variables === (item.variantId || item.id)
              }
            />
          ))}
        </div>

        {/* Sticky Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <CartSummary
              summary={summary}
              onCheckout={handleCheckout}
              isCheckingOut={isCheckingOut}
            />
          </div>
        </div>
      </div>

      {/* Remove Single Item Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(itemToRemove)}
        onClose={() => setItemToRemove(null)}
        onConfirm={handleConfirmRemoveItem}
        title="Remove Item from Cart?"
        description={`Are you sure you want to remove "${itemToRemove?.productName || "this item"}"${
          itemToRemove?.variantName ? ` (${itemToRemove.variantName})` : ""
        } from your cart?`}
        confirmText={removeItemMutation.isPending ? "Removing..." : "Remove"}
        cancelText="Cancel"
        variant="destructive"
        isLoading={removeItemMutation.isPending}
      />

      {/* Clear Entire Cart Confirmation Modal */}
      <ConfirmDialog
        open={isClearCartOpen}
        onClose={() => setIsClearCartOpen(false)}
        onConfirm={handleConfirmClearCart}
        title="Clear Shopping Cart?"
        description="Are you sure you want to remove all items from your shopping cart? This action cannot be undone."
        confirmText={clearCartMutation.isPending ? "Clearing..." : "Clear Cart"}
        cancelText="Cancel"
        variant="destructive"
        isLoading={clearCartMutation.isPending}
      />
    </div>
  );
}

