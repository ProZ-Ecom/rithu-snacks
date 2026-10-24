"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Smartphone,
  Monitor,
  ShoppingBag,
  Heart,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { FormModal } from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { SNACKSLOGOS } from "@/constants/storefront";
import { useVariantImages } from "../hooks";
import type { AdminVariantResponse } from "../types";

export interface VariantCustomerPreviewModalProps {
  variant: AdminVariantResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

function resolveFallbackImage(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("murukku") && lower.includes("kai")) return SNACKSLOGOS.kai_murukku;
  if (lower.includes("murukku") && lower.includes("thenkuzhal")) return SNACKSLOGOS.thenkuzhal_murukku;
  if (lower.includes("murukku") || lower.includes("butter")) return SNACKSLOGOS.special_butter_murukku;
  if (lower.includes("chip")) return SNACKSLOGOS.special_spicy_chips;
  if (lower.includes("mixture") || lower.includes("namkeen")) return SNACKSLOGOS.mixture;
  if (lower.includes("laddu")) return SNACKSLOGOS.laddu;
  if (lower.includes("jalebi")) return SNACKSLOGOS.jalebi;
  if (lower.includes("palkova")) return SNACKSLOGOS.palkova;
  return SNACKSLOGOS.special_butter_murukku;
}

export function VariantCustomerPreviewModal({
  variant,
  isOpen,
  onClose,
}: VariantCustomerPreviewModalProps) {
  const [activeView, setActiveView] = useState<"catalog" | "cart">("catalog");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [simulatedQuantity, setSimulatedQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch all images of this variant from the backend
  const { data: variantImages = [] } = useVariantImages(
    variant?.productId || null,
    variant?.id || null
  );

  // Reset active image on variant change or modal open
  useEffect(() => {
    setActiveImageIndex(0);
  }, [variant?.id, isOpen]);

  // Compile full list of image URLs (primary first, then gallery images)
  const imageList: string[] = useMemo(() => {
    if (!variant) return [];
    const urls: string[] = [];

    // Add primary image if available
    if (variant.primaryImage && typeof variant.primaryImage === "string") {
      urls.push(variant.primaryImage);
    }

    // Add images from useVariantImages query
    if (variantImages && variantImages.length > 0) {
      variantImages.forEach((img: any) => {
        const url = img?.imageUrl;
        if (url && !urls.includes(url)) {
          if (img.isPrimary) {
            urls.unshift(url);
          } else {
            urls.push(url);
          }
        }
      });
    }

    // Add any nested images from variant object if present
    const nestedImages = (variant as any).images;
    if (nestedImages && Array.isArray(nestedImages)) {
      nestedImages.forEach((img: any) => {
        const url = typeof img === "string" ? img : img?.imageUrl;
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      });
    }

    // Deduplicate array while preserving order
    const deduped = Array.from(new Set(urls.filter(Boolean)));

    // Fallback if no image found
    if (deduped.length === 0) {
      deduped.push(
        resolveFallbackImage(variant.productName || variant.variantName)
      );
    }

    return deduped;
  }, [variant, variantImages]);

  if (!variant) return null;

  const currentImage =
    imageList[activeImageIndex] ||
    imageList[0] ||
    resolveFallbackImage(variant.productName || variant.variantName);

  const basePrice = variant.basePrice ?? 0;
  const salePrice = variant.salePrice ?? basePrice;

  const discountPercent =
    basePrice > salePrice && basePrice > 0
      ? Math.round(((basePrice - salePrice) / basePrice) * 100)
      : 0;

  const measurementStr =
    variant.measurement && typeof variant.measurement === "object"
      ? `${variant.measurement.value} ${variant.measurement.unit}`
      : variant.variantName || "100g";

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(
      (prev) => (prev - 1 + imageList.length) % imageList.length
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % imageList.length);
  };

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title="Storefront Customer View Preview"
      description={`Preview how users see and interact with "${variant.variantName}" on the storefront with full image slider`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-cream-100 p-3 border border-cream-border">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-cream-border shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView("catalog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === "catalog"
                  ? "bg-[var(--color-secondary-600)] text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Catalog Card View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("cart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === "cart"
                  ? "bg-[var(--color-secondary-600)] text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Cart Item View</span>
            </button>
          </div>

          {/* Device Simulator Toggle */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-cream-border shadow-2xs">
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                deviceMode === "desktop"
                  ? "bg-cream-200 text-neutral-900 font-bold"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
              title="Desktop Viewport"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                deviceMode === "mobile"
                  ? "bg-cream-200 text-neutral-900 font-bold"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
              title="Mobile Viewport"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Live Simulation Container */}
        <div className="flex justify-center rounded-2xl bg-neutral-50/80 p-4 sm:p-8 border border-neutral-200 min-h-[420px] items-center">
          {activeView === "catalog" && (
            <div
              className={`transition-all duration-300 ${
                deviceMode === "mobile"
                  ? "w-full max-w-[290px]"
                  : "w-full max-w-[340px]"
              }`}
            >
              {/* Storefront Product Card Rendering */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 transition-all duration-300 flex flex-col justify-between hover:border-[var(--brown-700)] hover:shadow-xl shadow-xs">
                {/* Product Image Slider Container */}
                <div className="relative aspect-square overflow-hidden rounded-xl bg-cream-50 border border-cream-border-subtle group/slider">
                  <Image
                    key={currentImage}
                    src={currentImage}
                    alt={variant.productName || variant.variantName}
                    fill
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Discount Ribbon */}
                  {discountPercent > 0 && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10">
                      {discountPercent}% OFF
                    </div>
                  )}

                  {/* Wishlist Button Simulation */}
                  <button
                    type="button"
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center hover:bg-white shadow-xs transition-colors cursor-pointer z-10"
                  >
                    <Heart
                      className={`h-3.5 w-3.5 transition-colors ${
                        isWishlisted
                          ? "fill-red-500 text-red-500"
                          : "text-neutral-600"
                      }`}
                    />
                  </button>

                  {/* Multi-Image Slider Controls (Previous / Next Buttons) */}
                  {imageList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center shadow-md transition-all cursor-pointer z-20 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
                        title="Previous Image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center shadow-md transition-all cursor-pointer z-20 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
                        title="Next Image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Image Dots Indicator */}
                      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
                        {imageList.map((_, dotIdx) => (
                          <span
                            key={dotIdx}
                            className={`rounded-full transition-all duration-200 shadow-xs ${
                              dotIdx === activeImageIndex
                                ? "w-4 h-1.5 bg-white shadow-md"
                                : "w-1.5 h-1.5 bg-white/50"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Image Count Pill */}
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold tracking-wider z-10 pointer-events-none backdrop-blur-2xs">
                        {activeImageIndex + 1}/{imageList.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails strip for fast jumping */}
                {imageList.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto py-0.5 no-scrollbar">
                    {imageList.map((thumbUrl, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => setActiveImageIndex(tIdx)}
                        className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          tIdx === activeImageIndex
                            ? "border-[var(--brown-700)] shadow-xs scale-105"
                            : "border-cream-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={thumbUrl}
                          alt="Thumbnail"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Name + Weight */}
                <div className="flex mt-3 gap-2 justify-between items-start">
                  <h3 className="flex-1 pr-2 uppercase text-xs sm:text-[13px] font-bold leading-snug text-[var(--brown-900)]">
                    {variant.productName || variant.variantName}
                  </h3>

                  <div className="flex flex-col items-end shrink-0">
                    {/* Measurement Pill */}
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--brown-700)] text-white rounded-xs">
                      {measurementStr}
                    </span>

                    {/* Pricing */}
                    <div className="flex gap-1.5 mt-2 items-center">
                      <p className="font-bold text-xs sm:text-sm text-[var(--brown-900)]">
                        ₹{salePrice.toLocaleString("en-IN")}.00
                      </p>

                      {basePrice > salePrice && (
                        <p className="text-gray-400 line-through text-[10px] sm:text-xs">
                          ₹{basePrice.toLocaleString("en-IN")}.00
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Simulated Storefront Add To Cart CTA */}
                <div className="w-full flex justify-end mt-3.5">
                  <button
                    type="button"
                    className="w-full sm:w-[75%] py-2 px-3 rounded-md bg-[#d28b18] hover:bg-[#b87612] text-white text-xs font-bold uppercase tracking-wider text-center shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Add To Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === "cart" && (
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-[var(--color-secondary-600)]" />
                <span>Simulated Cart Item</span>
              </h4>

              <div className="flex gap-4 items-center">
                {/* Image with Mini Slider Navigation */}
                <div className="relative h-20 w-20 rounded-xl bg-cream-100 border border-cream-border overflow-hidden shrink-0 group/cartimg">
                  <Image
                    key={currentImage}
                    src={currentImage}
                    alt={variant.variantName}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />

                  {imageList.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-1 opacity-0 group-hover/cartimg:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black/80"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black/80"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-neutral-900 truncate">
                    {variant.productName || "Product"}
                  </h5>
                  <p className="text-xs text-neutral-600 font-medium mt-0.5">
                    Variant:{" "}
                    <span className="text-neutral-800 font-semibold">
                      {variant.variantName}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-600 font-medium">
                    Weight:{" "}
                    <span className="font-semibold text-neutral-800">
                      {measurementStr}
                    </span>
                  </p>
                  {imageList.length > 1 && (
                    <p className="text-[11px] text-secondary-600 font-medium flex items-center gap-1 mt-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>
                        Photo {activeImageIndex + 1} of {imageList.length}
                      </span>
                    </p>
                  )}
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSimulatedQuantity(Math.max(1, simulatedQuantity - 1))
                      }
                      className="h-6 w-6 flex items-center justify-center rounded bg-gray-100 text-neutral-700 hover:bg-gray-200 font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold px-1">
                      {simulatedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSimulatedQuantity(simulatedQuantity + 1)
                      }
                      className="h-6 w-6 flex items-center justify-center rounded bg-gray-100 text-neutral-700 hover:bg-gray-200 font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-neutral-900">
                      ₹
                      {(
                        Number(variant.salePrice) * simulatedQuantity
                      ).toLocaleString("en-IN")}
                      .00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Technical Variant Metadata Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-cream-50 border border-cream-border text-xs">
          <div>
            <span className="text-neutral-900 font-semibold block mb-0.5">
              SKU Code
            </span>
            <span className="font-mono font-bold text-neutral-700">
              {variant.sku}
            </span>
          </div>
          <div>
            <span className="text-neutral-900 font-semibold block mb-0.5">
              Active Status
            </span>
            <span
              className={`font-bold ${
                variant.isActive ? "text-emerald-700" : "text-error-700"
              }`}
            >
              {variant.isActive ? "Active (In Catalog)" : "Inactive (Hidden)"}
            </span>
          </div>
          <div>
            <span className="text-neutral-900 font-semibold block mb-0.5">
              Base Price / MRP
            </span>
            <span className="font-semibold text-neutral-700">
              ₹{variant.basePrice}.00
            </span>
          </div>
          <div>
            <span className="text-neutral-900 font-semibold block mb-0.5">
              Total Images
            </span>
            <span className="font-bold text-secondary-700">
              {imageList.length} photo{imageList.length > 1 ? "s" : ""} (Slider)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-5 text-xs font-semibold"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </FormModal>
  );
}

export default VariantCustomerPreviewModal;
