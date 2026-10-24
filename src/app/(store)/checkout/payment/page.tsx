"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingBag,
  AlertTriangle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/Radio";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/Toast";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useAddresses } from "@/features/addresses/hooks";
import { useCheckout } from "@/features/checkout/checkout-context";
import { useCheckoutSummary, usePlaceOrder } from "@/features/orders/hooks";
import {
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
} from "@/features/customers/hooks/use-customer-payment";
import { loadRazorpayScript } from "@/features/customers/utils/razorpay-loader";
import { OrderItemsList } from "@/features/orders/components/OrderItemsList";
import { OrderTotals } from "@/features/orders/components/OrderTotals";
import { PAYMENT_METHOD_OPTIONS } from "@/features/orders/constants";

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const checkout = useCheckout();
  const placeOrder = usePlaceOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();
  const verifyRazorpayPayment = useVerifyRazorpayPayment();

  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useCheckoutSummary(checkout.deliveryMethod, checkout.couponCode);

  if (status === "loading" || cartLoading || addressesLoading) {
    return <LoadingState text="Loading payment..." />;
  }

  if (status === "unauthenticated" || !session) {
    router.push("/login?callbackUrl=/checkout/payment");
    return null;
  }

  const userRole = (session?.user as any)?.role;
  const isAdminUser = userRole === "ADMIN" || userRole === "STAFF" || userRole === "SUPER_ADMIN";

  const items = cart?.items ?? [];
  const selectedAddress = addresses?.find((a) => a.id === checkout.addressId);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Nothing to pay for right now."
      >
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </EmptyState>
    );
  }

  const handlePlaceOrder = async () => {
    if (!checkout.addressId) {
      toast.error("Address Required", "Please select a delivery address to proceed.");
      return;
    }

    if (isAdminUser) {
      toast.error(
        "Action Disabled",
        "Admin accounts cannot place customer orders. Please log in with a customer account."
      );
      return;
    }

    // A. Cash on Delivery Flow
    if (checkout.paymentMethod === "CASH_ON_DELIVERY") {
      placeOrder.mutate(
        {
          addressId: checkout.addressId,
          deliveryMethod: checkout.deliveryMethod,
          couponCode: checkout.couponCode ?? undefined,
          paymentMethod: checkout.paymentMethod,
          notes: checkout.notes || undefined,
        },
        {
          onSuccess: (order) => {
            toast.success("Order Placed", "Your Cash on Delivery order is confirmed!");
            checkout.resetCheckout();
            router.push(`/checkout/success?orderNumber=${order.orderNumber}`);
          },
          onError: (err: any) => {
            toast.error("Order Failed", err?.message || "Could not place COD order. Please try again.");
          },
        }
      );
      return;
    }

    // B. Online Payment Flow (Razorpay Gateway)
    try {
      setIsRazorpayLoading(true);

      // 1. Asynchronously load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setIsRazorpayLoading(false);
        toast.error(
          "Payment Gateway Error",
          "Could not load Razorpay SDK. Please check your internet connection and try again."
        );
        return;
      }

      // 2. Create Razorpay Order from active cart
      const razorpayOrder = await createRazorpayOrder.mutateAsync({
        orderId: "cart",
        shippingAddressId: String(checkout.addressId),
        deliveryMethod: checkout.deliveryMethod,
      });

      // 3. Configure Razorpay Modal Options
      const user = session?.user;
      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Rithu's Snacks",
        description: `Order Checkout - ₹${(razorpayOrder.amount / 100).toFixed(2)}`,
        order_id: razorpayOrder.razorpayOrderId,
        prefill: {
          name: user?.name || selectedAddress?.firstName ? `${selectedAddress?.firstName} ${selectedAddress?.lastName || ""}`.trim() : "",
          email: user?.email || "",
          contact: (user as any)?.phone || selectedAddress?.phone || "",
        },
        theme: {
          color: "#EA580C", // Rithu Snacks warm amber-orange
        },
        modal: {
          ondismiss: () => {
            setIsRazorpayLoading(false);
            toast.error("Payment Incomplete", "You closed the payment window. You can retry whenever you are ready.");
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Verify Cryptographic Payment Signature & Create Confirmed Order
            const verifyResult = await verifyRazorpayPayment.mutateAsync({
              orderId: "cart",
              shippingAddressId: String(checkout.addressId),
              billingAddressId: String(checkout.addressId),
              deliveryMethod: checkout.deliveryMethod,
              notes: checkout.notes || undefined,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success("Payment Successful", "Your order has been verified and placed successfully!");
            checkout.resetCheckout();
            router.push(`/checkout/success?orderNumber=${verifyResult.orderNumber}`);
          } catch (err: any) {
            toast.error(
              "Verification Error",
              err?.message || "Payment verification failed. Please contact customer support."
            );
          } finally {
            setIsRazorpayLoading(false);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        setIsRazorpayLoading(false);
        toast.error(
          "Payment Failed",
          response?.error?.description || "Transaction was declined or failed. Please try again."
        );
      });
      razorpayInstance.open();
    } catch (err: any) {
      setIsRazorpayLoading(false);
      toast.error(
        "Order Creation Failed",
        err?.message || "Failed to initialize payment gateway. Please check item stock and retry."
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Payment & Confirmation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your snack order securely with Instant UPI, Cards, or NetBanking.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/checkout")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Address
        </Button>
      </div>

      {isAdminUser && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-950 flex items-start gap-3 shadow-xs dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
              Admin Account Notice
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              You are logged in with an Administrative or Staff account. Admin accounts cannot process checkout payments. Please sign in with a customer account to place orders.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Delivery Details & Payment Method */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivering To Card */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAddress ? (
                <div className="text-sm text-muted-foreground space-y-1 bg-muted/40 p-4 rounded-xl border">
                  <p className="font-semibold text-foreground">
                    {selectedAddress.firstName} {selectedAddress.lastName}
                  </p>
                  <p>
                    {selectedAddress.addressLine1}
                    {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ""}
                  </p>
                  <p>
                    {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}
                  </p>
                  <p className="text-xs font-medium text-foreground pt-1">
                    Phone: {selectedAddress.phone}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center">
                  <p className="text-sm text-muted-foreground">
                    No address selected.{" "}
                    <Link href="/checkout/address" className="text-primary font-medium hover:underline">
                      Select an address
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Selector */}
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base font-semibold">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Select Payment Method
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" /> 256-Bit SSL Encrypted
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                name="paymentMethod"
                value={checkout.paymentMethod}
                onValueChange={(value) =>
                  checkout.setPaymentMethod(value as typeof checkout.paymentMethod)
                }
                options={PAYMENT_METHOD_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  description: option.description,
                }))}
              />

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Razorpay supports <strong>Google Pay, PhonePe, Paytm, BHIM UPI, All Debit/Credit Cards, Netbanking</strong> & Popular Wallets.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Order Summary & Submit Button */}
        <div>
          <Card className="sticky top-24 border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto pr-1">
                <OrderItemsList items={summary?.items ?? []} compact />
              </div>

              <div className="my-4 border-t" />

              {summaryLoading ? (
                <LoadingState size="sm" text="Calculating totals..." />
              ) : summary ? (
                <OrderTotals
                  totals={{
                    subtotal: summary.subtotal,
                    taxAmount: summary.taxAmount ?? 0,
                    shippingAmount:
                      summary.shippingCharge ??
                      summary.deliveryCharge ??
                      summary.totals?.shipping ??
                      0,
                    discountAmount:
                      summary.discountAmount ??
                      summary.discount ??
                      summary.totals?.discount ??
                      0,
                    totalAmount:
                      summary.totalAmount ??
                      summary.total ??
                      summary.totals?.total ??
                      summary.subtotal,
                  }}
                  couponLabel={summary.coupon?.code ?? null}
                />
              ) : (
                <ErrorState
                  title="Could not calculate totals"
                  message={summaryError?.message}
                  onRetry={refetchSummary}
                />
              )}

              <Button
                className="mt-5 w-full font-semibold shadow-sm"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={
                  isAdminUser ||
                  !checkout.addressId ||
                  summaryLoading ||
                  placeOrder.isPending ||
                  isRazorpayLoading ||
                  createRazorpayOrder.isPending ||
                  verifyRazorpayPayment.isPending
                }
              >
                {(placeOrder.isPending ||
                  isRazorpayLoading ||
                  createRazorpayOrder.isPending ||
                  verifyRazorpayPayment.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isAdminUser
                  ? "Payment Disabled for Admin"
                  : verifyRazorpayPayment.isPending
                  ? "Verifying Payment..."
                  : isRazorpayLoading || createRazorpayOrder.isPending
                  ? "Opening Payment Gateway..."
                  : checkout.paymentMethod === "CASH_ON_DELIVERY"
                  ? "Place Order (Cash on Delivery)"
                  : "Pay Online with Razorpay"}
              </Button>

              {placeOrder.error && (
                <p className="mt-2 text-sm text-error-600">
                  {placeOrder.error.message}
                </p>
              )}

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Guaranteed Safe & Secure Checkout
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
