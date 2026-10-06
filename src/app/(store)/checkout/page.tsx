"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ProductImage } from "@/components/common/ProductImage";
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Lock,
  AlertCircle,
  Loader2,
  X,
  Phone,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { formatMeasurementLabel } from "@/features/variants/utils/measurement.util";
import { useCustomerCart } from "@/features/customers/hooks/use-customer-cart";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCustomerAddresses,
  useCreateCustomerAddress,
} from "@/features/customers/hooks/use-customer-address";
import {
  useCreateCustomerOrder,
  CUSTOMER_ORDERS_QUERY_KEY,
} from "@/features/customers/hooks/use-customer-orders";
import { customerPaymentApi } from "@/features/customers/api/customer-payment.api";
import { useCheckout } from "@/features/checkout/checkout-context";
import type { CustomerAddressResponse } from "@/features/customers/types/customer-address.types";
import { usePincodeLookup } from "@/lib/pincode";
import { loadRazorpayScript } from "@/features/customers/utils/razorpay-loader";


function CheckoutSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-96 rounded-lg skeleton-shimmer" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-6 space-y-4">
            <div className="h-6 w-48 rounded-md skeleton-shimmer" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 rounded-xl skeleton-shimmer" />
              <div className="h-36 rounded-xl skeleton-shimmer" />
            </div>
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-6 space-y-4">
            <div className="h-6 w-48 rounded-md skeleton-shimmer" />
            <div className="h-24 rounded-xl skeleton-shimmer" />
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-6 space-y-4">
            <div className="h-6 w-48 rounded-md skeleton-shimmer" />
            <div className="h-40 rounded-xl skeleton-shimmer" />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-6 space-y-4">
            <div className="h-6 w-36 rounded-md skeleton-shimmer" />
            <div className="h-32 rounded-xl skeleton-shimmer" />
            <div className="h-12 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status: authStatus } = useSession();
  const { isOrderPlaced, setIsOrderPlaced } = useCheckout();

  // Customer Module TanStack Query hooks
  const { data: cart, isLoading: cartLoading } = useCustomerCart();
  const { data: addresses = [], isLoading: addressesLoading } =
    useCustomerAddresses();
  const createAddressMutation = useCreateCustomerAddress();
  const createOrderMutation = useCreateCustomerOrder();

  // Selected state
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">(
    "standard"
  );
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "COD">(
    "CARD"
  );
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Payment in-flight guards
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);


  // Add Address Modal state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    addressType: "shipping" as const,
    isDefault: true,
  });
  const [addressFieldErrors, setAddressFieldErrors] = useState<Record<string, string>>({});
  const [touchedAddressFields, setTouchedAddressFields] = useState<Record<string, boolean>>({});
  const [addressFormError, setAddressFormError] = useState<string | null>(null);

  const {
    isLoading: isPincodeLoading,
    cityOptions,
    fetchPincode,
    resetLookup,
  } = usePincodeLookup();

  const checkoutCityOptions = useMemo(() => {
    const opts = cityOptions.map((c) => ({ value: c, label: c }));
    if (newAddressForm.city && !cityOptions.includes(newAddressForm.city)) {
      return [{ value: newAddressForm.city, label: newAddressForm.city }, ...opts];
    }
    return opts;
  }, [cityOptions, newAddressForm.city]);

  const validateAddressField = (field: string, value: string): string => {
    switch (field) {
      case "fullName": {
        const trimmed = value.trim();
        if (!trimmed) return "Recipient Name is required";
        if (trimmed.length < 2) return "Recipient Name must be at least 2 characters";
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return "Recipient Name can only contain letters and spaces";
        if (trimmed.length > 150) return "Recipient Name cannot exceed 150 characters";
        return "";
      }
      case "phone": {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "Phone Number is required";
        if (!/^[6-9]/.test(digits)) return "Phone number must start with 6, 7, 8, or 9";
        if (digits.length < 10) return "Phone number must be exactly 10 digits";
        return "";
      }
      case "addressLine1": {
        const trimmed = value.trim();
        if (!trimmed) return "Flat / House No., Building, Street is required";
        if (trimmed.length < 3) return "Address must be at least 3 characters";
        if (trimmed.length > 255) return "Address cannot exceed 255 characters";
        return "";
      }
      case "city": {
        const trimmed = value.trim();
        if (!trimmed) return "City is required";
        if (trimmed.length < 2) return "City must be at least 2 characters";
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return "City can only contain letters and spaces";
        if (trimmed.length > 100) return "City cannot exceed 100 characters";
        return "";
      }
      case "pincode": {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "PIN Code is required";
        if (digits.startsWith("0")) return "Invalid PIN code (cannot start with 0)";
        if (digits.length < 6) return "PIN code must be exactly 6 digits";
        return "";
      }
      default:
        return "";
    }
  };

  const handleAddressFieldChange = (field: string, rawValue: string | boolean) => {
    let value = rawValue;

    // Enforce numbers-only constraint and max length while typing
    if (field === "phone" && typeof rawValue === "string") {
      value = rawValue.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pincode" && typeof rawValue === "string") {
      const cleanDigits = rawValue.replace(/\D/g, "").slice(0, 6);
      value = cleanDigits;

      if (cleanDigits.length === 6) {
        fetchPincode(cleanDigits, (data) => {
          setNewAddressForm((prev) => ({
            ...prev,
            state: data.state || prev.state,
            city: data.cities.includes(prev.city)
              ? prev.city
              : data.defaultCity || prev.city,
          }));
          setAddressFieldErrors((prev) => {
            const next = { ...prev };
            delete next.pincode;
            delete next.city;
            return next;
          });
        });
      }
    }

    setNewAddressForm((prev) => ({ ...prev, [field]: value }));
    setTouchedAddressFields((prev) => ({ ...prev, [field]: true }));

    if (typeof value === "string") {
      const errorMsg = validateAddressField(field, value);
      setAddressFieldErrors((prev) => {
        const next = { ...prev };
        if (errorMsg) {
          next[field] = errorMsg;
        } else {
          delete next[field];
        }
        return next;
      });
    }

    if (addressFormError) {
      setAddressFormError(null);
    }
  };

  const handleAddressFieldBlur = (field: string) => {
    setTouchedAddressFields((prev) => ({ ...prev, [field]: true }));
    const val = String((newAddressForm as any)[field] || "");
    const errorMsg = validateAddressField(field, val);
    setAddressFieldErrors((prev) => {
      const next = { ...prev };
      if (errorMsg) {
        next[field] = errorMsg;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleCloseAddressForm = () => {
    setIsAddingAddress(false);
    setAddressFieldErrors({});
    setTouchedAddressFields({});
    setAddressFormError(null);
    resetLookup();
    setNewAddressForm({
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      addressType: "shipping",
      isDefault: true,
    });
  };


  // Effective selected address (fall back to default or first available)
  const effectiveAddressId = useMemo(() => {
    if (selectedAddressId && addresses.some((a) => a.id === selectedAddressId)) {
      return selectedAddressId;
    }
    const defaultAddr = addresses.find((a) => a.isDefault);
    if (defaultAddr) return defaultAddr.id;
    if (addresses.length > 0) return addresses[0].id;
    return "";
  }, [selectedAddressId, addresses]);

  // Pricing calculations
  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal ?? cart?.total ?? 0);
  const totalDiscount = Number(cart?.totalDiscount ?? cart?.totalSavings ?? 0);
  const isFreeDelivery = subtotal >= 499;
  const shippingCharge =
    deliveryMethod === "express" ? 99 : isFreeDelivery ? 0 : 49;
  const grandTotal = subtotal + shippingCharge;

  // Authentication gate
  if (authStatus === "loading" || (cartLoading && !cart) || addressesLoading) {
    return <CheckoutSkeleton />;
  }

  if (authStatus === "unauthenticated" || !session) {
    router.push("/login?callbackUrl=/checkout");
    return null;
  }

  // Order placed confirmation guard (prevents flashing empty cart screen)
  if (isOrderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4 animate-in fade-in duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 shadow-sm animate-in zoom-in-75 duration-300">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-theme-text-primary">
          Order Placed Successfully!
        </h2>
        <p className="text-xs sm:text-sm text-theme-text-subtle">
          Finalizing your order confirmation... Please wait.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-theme-text-muted pt-2">
          <Loader2 className="h-4 w-4 animate-spin text-theme-primary" />
          <span>Preparing your order receipt...</span>
        </div>
      </div>
    );
  }

  // Empty cart guard

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-theme-surface-alt border border-theme-border text-theme-primary">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text-primary mb-2">
          Your Cart is Empty
        </h1>
        <p className="text-theme-text-subtle mb-6 text-sm max-w-md mx-auto">
          Explore our handcrafted traditional South Indian snacks and sweets to
          proceed with your order.
        </p>
        <Link href="/products">
          <Button className="min-h-[44px] px-6 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white font-semibold shadow-sm">
            Browse Authentic Snacks
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }


  // Handle address form creation
  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressFormError(null);

    // Mark all required fields as touched on submit
    setTouchedAddressFields({
      fullName: true,
      phone: true,
      addressLine1: true,
      city: true,
      pincode: true,
    });

    const errors: Record<string, string> = {};
    const nameErr = validateAddressField("fullName", newAddressForm.fullName);
    if (nameErr) errors.fullName = nameErr;

    const phoneErr = validateAddressField("phone", newAddressForm.phone);
    if (phoneErr) errors.phone = phoneErr;

    const addrErr = validateAddressField("addressLine1", newAddressForm.addressLine1);
    if (addrErr) errors.addressLine1 = addrErr;

    const cityErr = validateAddressField("city", newAddressForm.city);
    if (cityErr) errors.city = cityErr;

    const pinErr = validateAddressField("pincode", newAddressForm.pincode);
    if (pinErr) errors.pincode = pinErr;

    if (Object.keys(errors).length > 0) {
      setAddressFieldErrors(errors);
      return;
    }

    try {
      const cleanPhone = `+91${newAddressForm.phone.replace(/\D/g, "").slice(-10)}`;

      const created = await createAddressMutation.mutateAsync({
        fullName: newAddressForm.fullName.trim(),
        phone: cleanPhone,
        addressLine1: newAddressForm.addressLine1.trim(),
        addressLine2: newAddressForm.addressLine2.trim() || undefined,
        landmark: newAddressForm.landmark.trim() || undefined,
        city: newAddressForm.city.trim(),
        state: newAddressForm.state.trim(),
        pincode: newAddressForm.pincode.trim(),
        country: "India",
        addressType: "shipping",
        isDefault: newAddressForm.isDefault,
      });

      setSelectedAddressId(created.id);
      handleCloseAddressForm();
    } catch (err: any) {
      setAddressFormError(err.message || "Failed to save address");
    }
  };

  // In-built Razorpay payment flow via embedded modal
  const launchInbuiltRazorpayPayment = async (targetAddressId?: string) => {
    setIsProcessingPayment(true);
    setCheckoutError(null);

    const shippingId = targetAddressId || effectiveAddressId;
    if (!shippingId) {
      setIsProcessingPayment(false);
      setCheckoutError("Please select or add a delivery address first.");
      return;
    }

    try {
      // 1. Asynchronously load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setIsProcessingPayment(false);
        setCheckoutError(
          "Could not load Razorpay SDK. Please check your internet connection and try again."
        );
        return;
      }

      // 2. Create Razorpay Order from active cart
      const razorpayOrder = await customerPaymentApi.createRazorpayOrder({
        orderId: "cart",
        shippingAddressId: shippingId,
        deliveryMethod: deliveryMethod,
      });

      // 3. Find address details for prefill
      const chosenAddress = addresses.find((a) => a.id === shippingId);
      const user = session?.user;

      // 4. Configure Razorpay In-built Modal Options
      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "Rithu's Snacks",
        description: `Order Checkout - ₹${(razorpayOrder.amount / 100).toFixed(2)}`,
        order_id: razorpayOrder.razorpayOrderId,
        prefill: {
          name: chosenAddress ? chosenAddress.fullName : user?.name || "",
          email: user?.email || "",
          contact: chosenAddress?.phone || (user as any)?.phone || "",
        },

        theme: {
          color: "#7D1D20", // Rithu Snacks warm brand maroon
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            setIsVerifyingPayment(false);
            setCheckoutError(
              "Payment window was closed. You can retry whenever you are ready."
            );
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setIsVerifyingPayment(true);
          try {
            // 5. Verify Cryptographic Payment Signature & Confirm Order
            const verifyResult = await customerPaymentApi.verifyPayment({
              orderId: "cart",
              shippingAddressId: shippingId,
              billingAddressId: shippingId,
              deliveryMethod: deliveryMethod,
              notes: orderNotes.trim() || undefined,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setIsOrderPlaced(true);
            queryClient.invalidateQueries({
              queryKey: CUSTOMER_ORDERS_QUERY_KEY,
              refetchType: "all",
            });
            queryClient.invalidateQueries({
              queryKey: ["customer", "cart"],
              refetchType: "all",
            });
            queryClient.invalidateQueries({
              queryKey: ["cart"],
              refetchType: "all",
            });

            router.push(
              `/checkout/success?orderNumber=${encodeURIComponent(
                verifyResult.orderNumber
              )}&orderId=${encodeURIComponent(verifyResult.orderId)}`
            );
          } catch (err: any) {
            setCheckoutError(
              err.message ||
                "Payment verification failed. Please contact customer support."
            );
          } finally {
            setIsProcessingPayment(false);
            setIsVerifyingPayment(false);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        setIsProcessingPayment(false);
        setIsVerifyingPayment(false);
        setCheckoutError(
          response?.error?.description ||
            "Transaction was declined or failed. Please try again."
        );
      });
      razorpayInstance.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      setIsVerifyingPayment(false);
      setCheckoutError(
        err.message ||
          "Failed to initialize payment gateway. Please check item stock and retry."
      );
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async () => {
    setCheckoutError(null);

    if (!effectiveAddressId) {
      setCheckoutError("Please select or add a delivery address to proceed.");
      return;
    }

    if (isProcessingPayment || isVerifyingPayment || createOrderMutation.isPending) {
      return;
    }

    // 1. Cash on Delivery (COD) flow
    if (paymentMethod === "COD") {
      try {
        const orderRes = await createOrderMutation.mutateAsync({
          shippingAddressId: effectiveAddressId,
          deliveryMethod: deliveryMethod,
          paymentMethod: "COD",
          notes: orderNotes.trim() || undefined,
          paymentDetails: {
            method: "COD",
            status: "pending",
          },
        });

        const order =
          (orderRes as any)?.data?.data ||
          (orderRes as any)?.data ||
          orderRes;
        const orderId = order?.id;
        const orderNumber = order?.orderNumber;

        setIsOrderPlaced(true);
        queryClient.invalidateQueries({ queryKey: CUSTOMER_ORDERS_QUERY_KEY, refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["customer", "cart"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["cart"], refetchType: "all" });

        const params = new URLSearchParams();
        if (orderId && String(orderId) !== "undefined" && String(orderId) !== "null") {
          params.set("orderId", String(orderId));
        }
        if (orderNumber && String(orderNumber) !== "undefined" && String(orderNumber) !== "null") {
          params.set("orderNumber", String(orderNumber));
        }
        router.push(`/checkout/success${params.toString() ? `?${params.toString()}` : ""}`);
      } catch (err: any) {
        setIsOrderPlaced(false);
        setCheckoutError(
          err.message || "Failed to place COD order. Please check details and try again."
        );
      }
      return;
    }

    // 2. Online Payment (In-built Razorpay standard modal)
    await launchInbuiltRazorpayPayment(effectiveAddressId);
  };



  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-7xl">
      {/* Header & Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-theme-text-subtle mb-2">
          <Link
            href="/cart"
            className="hover:text-theme-primary transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Cart
          </Link>
          <span>/</span>
          <span className="text-theme-primary font-bold">Checkout</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text-primary">
              Checkout & Payment
            </h1>
            <p className="text-xs sm:text-sm text-theme-text-subtle mt-0.5">
              Review your delivery address, choose a shipping option, and complete
              your simulated payment.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold bg-theme-surface-alt border border-theme-border px-3.5 py-1.5 rounded-full text-theme-text-subtle self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-theme-secondary" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to complete checkout</p>
            <p className="text-xs mt-0.5">{checkoutError}</p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Steps (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Delivery Address Card */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-theme-border-subtle">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-surface-alt border border-theme-border text-theme-primary font-bold text-xs">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-theme-text-primary flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-theme-secondary" />
                  Delivery Address
                </h2>
              </div>

              {!isAddingAddress && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingAddress(true)}
                  className="rounded-xl border-theme-border text-xs font-bold text-theme-primary hover:bg-theme-surface-alt min-h-[36px]"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add New
                </Button>
              )}
            </div>

            {/* Address Selection List */}
            {!isAddingAddress && (
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-theme-border p-6 text-center">
                    <p className="text-sm font-semibold text-theme-text-primary mb-1">
                      No saved addresses found
                    </p>
                    <p className="text-xs text-theme-text-subtle mb-4">
                      Please add your delivery address to receive freshly packed
                      snacks.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="min-h-[44px] rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-semibold px-4"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Delivery Address
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {addresses.map((addr) => {
                      const isSelected = effectiveAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "border-theme-primary bg-theme-surface-alt/70 shadow-xs ring-1 ring-theme-primary"
                              : "border-theme-border bg-theme-surface hover:border-theme-border-accent hover:bg-theme-surface-warm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                                  isSelected
                                    ? "border-theme-primary bg-theme-primary text-white"
                                    : "border-theme-border-input bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </span>
                              <span className="font-bold text-sm text-theme-text-primary line-clamp-1">
                                {addr.fullName}
                              </span>
                            </div>

                            {addr.isDefault && (
                              <span className="shrink-0 rounded-md bg-theme-status-del-bg px-2 py-0.5 text-[10px] font-extrabold text-theme-status-del-fg">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-theme-text-subtle space-y-1 pl-6">
                            <p className="line-clamp-2">
                              {addr.addressLine1}
                              {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                            </p>
                            <p>
                              {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                            <p className="flex items-center gap-1 text-theme-text-muted pt-0.5">
                              <Phone className="h-3 w-3" />
                              {addr.phone}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Inline Add Address Form */}
            {isAddingAddress && (
              <form
                onSubmit={handleCreateAddress}
                noValidate
                className="rounded-xl border border-theme-border bg-theme-surface-warm p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-theme-border pb-2.5">
                  <h3 className="text-sm font-bold text-theme-text-primary">
                    New Delivery Address
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseAddressForm}
                    className="text-theme-text-subtle hover:text-theme-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {addressFormError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
                    {addressFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-theme-text-secondary mb-1">
                      Recipient Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter recipient name"
                      value={newAddressForm.fullName}
                      onChange={(e) =>
                        handleAddressFieldChange("fullName", e.target.value)
                      }
                      onBlur={() => handleAddressFieldBlur("fullName")}
                      className={`w-full min-h-[44px] rounded-xl border bg-white px-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none transition-colors ${
                        touchedAddressFields.fullName && addressFieldErrors.fullName
                          ? "border-red-500 bg-red-50/20 focus:border-red-500"
                          : "border-theme-border-input focus:border-theme-primary"
                      }`}
                    />
                    {touchedAddressFields.fullName && addressFieldErrors.fullName && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {addressFieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text-secondary mb-1">
                      Phone Number (10 digits) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter phone number"
                      value={newAddressForm.phone}
                      onChange={(e) =>
                        handleAddressFieldChange("phone", e.target.value)
                      }
                      onBlur={() => handleAddressFieldBlur("phone")}
                      className={`w-full min-h-[44px] rounded-xl border bg-white px-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none transition-colors ${
                        touchedAddressFields.phone && addressFieldErrors.phone
                          ? "border-red-500 bg-red-50/20 focus:border-red-500"
                          : "border-theme-border-input focus:border-theme-primary"
                      }`}
                    />
                    {touchedAddressFields.phone && addressFieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {addressFieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-theme-text-secondary mb-1">
                      Flat / House No., Building, Street <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter flat / house no., building, street"
                      value={newAddressForm.addressLine1}
                      onChange={(e) =>
                        handleAddressFieldChange("addressLine1", e.target.value)
                      }
                      onBlur={() => handleAddressFieldBlur("addressLine1")}
                      className={`w-full min-h-[44px] rounded-xl border bg-white px-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none transition-colors ${
                        touchedAddressFields.addressLine1 && addressFieldErrors.addressLine1
                          ? "border-red-500 bg-red-50/20 focus:border-red-500"
                          : "border-theme-border-input focus:border-theme-primary"
                      }`}
                    />
                    {touchedAddressFields.addressLine1 && addressFieldErrors.addressLine1 && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {addressFieldErrors.addressLine1}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text-secondary mb-1">
                      <span className="flex items-center justify-between">
                        <span>PIN Code (6 digits) <span className="text-red-500 font-bold ml-0.5">*</span></span>
                        {isPincodeLoading && (
                          <span className="text-[10px] text-theme-primary font-normal flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching area...
                          </span>
                        )}
                      </span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit PIN code"
                      value={newAddressForm.pincode}
                      onChange={(e) =>
                        handleAddressFieldChange("pincode", e.target.value)
                      }
                      onBlur={() => handleAddressFieldBlur("pincode")}
                      className={`w-full min-h-[44px] rounded-xl border bg-white px-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none transition-colors ${
                        touchedAddressFields.pincode && addressFieldErrors.pincode
                          ? "border-red-500 bg-red-50/20 focus:border-red-500"
                          : "border-theme-border-input focus:border-theme-primary"
                      }`}
                    />
                    {touchedAddressFields.pincode && addressFieldErrors.pincode && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {addressFieldErrors.pincode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-theme-text-secondary mb-1">
                      <span className="flex items-center justify-between">
                        <span>City / Area <span className="text-red-500 font-bold ml-0.5">*</span></span>
                        {cityOptions.length > 0 && (
                          <span className="text-[10px] text-theme-text-muted font-normal">
                            ({cityOptions.length} areas found)
                          </span>
                        )}
                      </span>
                    </label>
                    {cityOptions.length > 0 ? (
                      <Select
                        value={newAddressForm.city}
                        onValueChange={(val) => {
                          handleAddressFieldChange("city", val);
                          handleAddressFieldBlur("city");
                        }}
                        options={checkoutCityOptions}
                        placeholder="Select City / Area"
                        error={touchedAddressFields.city ? addressFieldErrors.city : undefined}
                        className="min-h-[44px] rounded-xl bg-white"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter your city"
                        value={newAddressForm.city}
                        onChange={(e) =>
                          handleAddressFieldChange("city", e.target.value)
                        }
                        onBlur={() => handleAddressFieldBlur("city")}
                        className={`w-full min-h-[44px] rounded-xl border bg-white px-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none transition-colors ${
                          touchedAddressFields.city && addressFieldErrors.city
                            ? "border-red-500 bg-red-50/20 focus:border-red-500"
                            : "border-theme-border-input focus:border-theme-primary"
                        }`}
                      />
                    )}
                    {touchedAddressFields.city && addressFieldErrors.city && !cityOptions.length && (
                      <p className="mt-1 text-xs text-red-500 font-medium">
                        {addressFieldErrors.city}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseAddressForm}
                    className="min-h-[40px] text-xs font-semibold rounded-xl text-theme-text-subtle"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createAddressMutation.isPending}
                    className="min-h-[40px] px-4 text-xs font-bold rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white"
                  >
                    {createAddressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving Address...
                      </>
                    ) : (
                      "Save Address"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* 2. Delivery Method Card */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-theme-border-subtle">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-surface-alt border border-theme-border text-theme-primary font-bold text-xs">
                2
              </span>
              <h2 className="text-base sm:text-lg font-bold text-theme-text-primary flex items-center gap-2">
                <Truck className="h-4 w-4 text-theme-secondary" />
                Shipping & Delivery Method
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Standard */}
              <div
                onClick={() => setDeliveryMethod("standard")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  deliveryMethod === "standard"
                    ? "border-theme-primary bg-theme-surface-alt/70 shadow-xs ring-1 ring-theme-primary"
                    : "border-theme-border bg-theme-surface hover:border-theme-border-accent"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-theme-text-primary">
                    Standard Delivery
                  </span>
                  <span className="text-xs font-extrabold text-theme-primary">
                    {isFreeDelivery ? "FREE" : "₹49"}
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-subtle flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Estimated: 3 - 5 business days
                </p>
                {isFreeDelivery && (
                  <span className="mt-2 inline-block rounded bg-theme-status-del-bg px-2 py-0.5 text-[10px] font-bold text-theme-status-del-fg">
                    Free Delivery Unlocked!
                  </span>
                )}
              </div>

              {/* Express */}
              <div
                onClick={() => setDeliveryMethod("express")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  deliveryMethod === "express"
                    ? "border-theme-primary bg-theme-surface-alt/70 shadow-xs ring-1 ring-theme-primary"
                    : "border-theme-border bg-theme-surface hover:border-theme-border-accent"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-theme-text-primary">
                      Express Fast Delivery
                    </span>
                    <Sparkles className="h-3 w-3 text-theme-secondary" />
                  </div>
                  <span className="text-xs font-extrabold text-theme-primary">
                    ₹99
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-subtle flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Estimated: 1 - 2 business days (Priority)
                </p>
              </div>
            </div>
          </div>

          {/* 3. Payment Method Card */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-theme-border-subtle">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-surface-alt border border-theme-border text-theme-primary font-bold text-xs">
                  3
                </span>
                <h2 className="text-base sm:text-lg font-bold text-theme-text-primary flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-theme-secondary" />
                  Payment Method
                </h2>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Razorpay Secured
              </span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all min-h-[64px] ${
                  paymentMethod === "CARD" || paymentMethod === "UPI"
                    ? "border-theme-primary bg-theme-surface-alt font-bold text-theme-primary shadow-xs ring-1 ring-theme-primary"
                    : "border-theme-border bg-theme-surface text-theme-text-subtle hover:bg-theme-surface-warm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-theme-primary" />
                  <span className="text-xs font-black">UPI / Cards / NetBanking</span>
                </div>
                <span className="text-[11px] font-medium text-theme-text-muted">Online via Razorpay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all min-h-[64px] ${
                  paymentMethod === "COD"
                    ? "border-theme-primary bg-theme-surface-alt font-bold text-theme-primary shadow-xs ring-1 ring-theme-primary"
                    : "border-theme-border bg-theme-surface text-theme-text-subtle hover:bg-theme-surface-warm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-theme-secondary" />
                  <span className="text-xs font-black">Cash on Delivery</span>
                </div>
                <span className="text-[11px] font-medium text-theme-text-muted">Pay upon delivery</span>
              </button>
            </div>

            {/* Payment Details Container */}
            {(paymentMethod === "CARD" || paymentMethod === "UPI") && (
              <div className="rounded-xl border border-theme-border-subtle bg-theme-surface-alt/60 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-theme-text-primary">
                      Official Razorpay Payment Gateway
                    </h3>
                    <p className="text-[11px] text-theme-text-subtle mt-0.5">
                      Fast, safe, and encrypted payment with instant order confirmation.
                    </p>
                  </div>
                  <span className="rounded bg-white border border-theme-border px-2 py-0.5 text-[10px] font-bold text-theme-text-secondary shadow-2xs">
                    256-bit SSL
                  </span>
                </div>

                {/* Badges of accepted methods */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg bg-white border border-theme-border/80 px-2.5 py-2 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-theme-text-primary block">UPI</span>
                    <span className="text-[10px] text-theme-text-muted">GPay, PhonePe, Paytm</span>
                  </div>
                  <div className="rounded-lg bg-white border border-theme-border/80 px-2.5 py-2 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-theme-text-primary block">Cards</span>
                    <span className="text-[10px] text-theme-text-muted">Visa, Master, RuPay</span>
                  </div>
                  <div className="rounded-lg bg-white border border-theme-border/80 px-2.5 py-2 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-theme-text-primary block">Net Banking</span>
                    <span className="text-[10px] text-theme-text-muted">All major Indian banks</span>
                  </div>
                  <div className="rounded-lg bg-white border border-theme-border/80 px-2.5 py-2 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-theme-text-primary block">Wallets</span>
                    <span className="text-[10px] text-theme-text-muted">Amazon Pay & more</span>
                  </div>
                </div>

                <div className="text-[11px] text-theme-text-subtle bg-white/90 border border-theme-border rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Clicking <strong>&ldquo;Pay {formatPrice(grandTotal)} via Razorpay&rdquo;</strong> will open the secure checkout dialog where you can complete payment seamlessly.
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === "COD" && (
              <div className="rounded-xl border border-theme-border-subtle bg-theme-surface-alt/60 p-4 sm:p-5 space-y-2">
                <p className="text-xs font-bold text-theme-text-primary">
                  Pay with Cash upon Doorstep Delivery
                </p>
                <p className="text-[11px] text-theme-text-subtle leading-relaxed">
                  Please keep exact change ready upon delivery. Our delivery partner will verify and hand over your fresh package with a receipt.
                </p>
              </div>
            )}
          </div>


          {/* 4. Delivery Instructions */}
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs p-5 sm:p-6">
            <label className="block text-xs font-bold text-theme-text-primary mb-1.5">
              Special Delivery Instructions (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="Enter delivery instructions (optional)..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full rounded-xl border border-theme-border-input bg-white p-3 text-xs text-theme-text-primary placeholder:text-theme-text-muted focus:border-theme-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar (4 cols - Sticky) */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="rounded-2xl border border-theme-border bg-theme-surface shadow-xs overflow-hidden">
            <div className="border-b border-theme-border-subtle bg-theme-surface-alt px-5 py-4">
              <h2 className="text-base font-bold text-theme-text-primary flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-theme-secondary" />
                Order Summary ({items.length} {items.length === 1 ? "item" : "items"})
              </h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Items Mini List */}
              <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-theme-border-subtle pr-1">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-xl border border-theme-border bg-theme-surface-alt shrink-0 overflow-hidden">
                      <ProductImage
                        src={item.primaryImage}
                        alt={item.productName}
                        fallbackText={item.productName}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-theme-text-primary truncate">
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-theme-text-subtle">
                        {item.variantName}{" "}
                        {item.measurement
                          ? `(${formatMeasurementLabel(item.measurement)})`
                          : ""}
                      </p>
                      <p className="text-[11px] text-theme-text-muted">
                        Qty: {item.quantity} × {formatPrice(item.currentPrice)}
                      </p>
                    </div>

                    <div className="text-xs font-bold text-theme-text-primary shrink-0">
                      {formatPrice(item.itemTotal)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="border-t border-theme-border-subtle pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-theme-text-subtle">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-theme-text-primary">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-emerald-600">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>Offer Savings</span>
                    </span>
                    <span className="font-semibold">
                      -{formatPrice(totalDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-theme-text-subtle items-center">
                  <span>Shipping & Handling</span>
                  {shippingCharge === 0 ? (
                    <span className="rounded bg-theme-status-del-bg px-2 py-0.5 text-[10px] font-bold text-theme-status-del-fg">
                      FREE
                    </span>
                  ) : (
                    <span className="font-semibold text-theme-text-primary">
                      {formatPrice(shippingCharge)}
                    </span>
                  )}
                </div>

                <div className="border-t border-theme-border pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-theme-text-primary">
                    Total Amount
                  </span>
                  <span className="text-xl font-extrabold text-theme-primary">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              <Button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  createOrderMutation.isPending ||
                  isProcessingPayment ||
                  isVerifyingPayment ||
                  addressesLoading ||
                  !effectiveAddressId
                }
                className="w-full min-h-[48px] rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {isVerifyingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Payment...
                  </>
                ) : isProcessingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Razorpay Gateway...
                  </>
                ) : createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Your Order...
                  </>
                ) : paymentMethod === "COD" ? (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Confirm COD Order ({formatPrice(grandTotal)})
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay {formatPrice(grandTotal)} via Razorpay
                  </>
                )}
              </Button>

              <div className="text-[11px] text-center text-theme-text-muted space-y-1 pt-1">
                <p className="flex items-center justify-center gap-1.5 font-medium text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  256-bit Bank-Grade Encryption by Razorpay
                </p>
                <p>Handcrafted South Indian delicacies delivered fresh to your door.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
