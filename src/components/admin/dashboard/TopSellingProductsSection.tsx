"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Package } from "lucide-react";
import { formatPrice, getImageUrl } from "@/lib/utils";
import type { TopSellingProduct } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface TopSellingProductsSectionProps {
  products: TopSellingProduct[];
}

function ProductThumbnail({
  src,
  alt,
  index,
}: {
  src?: string | null;
  alt: string;
  index: number;
}) {
  const [imgError, setImgError] = React.useState(false);
  const normalizedSrc = getImageUrl(src);

  const hasValidSrc = Boolean(
    src &&
      src.trim() !== "" &&
      src.trim() !== "null" &&
      src.trim() !== "undefined" &&
      src.trim() !== "/images/placeholder.png" &&
      !imgError
  );

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-amber-50/60 shadow-2xs">
      {hasValidSrc ? (
        <img
          src={normalizedSrc}
          alt=""
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-amber-700 font-black text-xs">
          <Package className="h-5 w-5 text-amber-600/80" />
        </div>
      )}
      <span className="absolute bottom-0 right-0 z-10 rounded-tl-md bg-stone-900/85 px-1 py-0.2 text-[9px] font-bold text-white shadow-xs">
        #{index + 1}
      </span>
    </div>
  );
}

export function TopSellingProductsSection({ products }: TopSellingProductsSectionProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Top Selling Products
            </h2>
            <p className="text-xs text-stone-500">
              Ranked by units dispatched &amp; revenue this month
            </p>
          </div>
          <Link
            href="/admin/dashboard/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors shrink-0"
          >
            <span>View All Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Product Items List */}
        {products.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-center text-stone-500">
            <Package className="h-8 w-8 text-stone-400 mb-2" />
            <p className="text-xs font-semibold text-stone-700">No Product Sales Recorded</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Products will appear here as orders are placed.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-stone-100">
            {products.map((item, index) => {
              const isLow = item.stockStatus === "low_stock" || item.stockQuantity <= 10;
              const isOut = item.stockStatus === "out_of_stock" || item.stockQuantity === 0;

              return (
                <div key={item.id} className="group py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  {/* Left: Thumbnail + Name/SKU */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumbnail src={item.image} alt={item.name} index={index} />

                    <div className="min-w-0">
                      <h3 className="truncate text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5">
                        <span className="font-medium text-stone-600">{item.category}</span> &bull; SKU: {item.sku}
                      </p>
                    </div>
                  </div>

                  {/* Right: Revenue & Stock Pill */}
                  <div className="flex flex-col items-end shrink-0 gap-1 text-right">
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-stone-900">
                        {formatPrice(item.revenue)}
                      </span>
                      <p className="text-[10px] text-stone-500">
                        {item.unitsSold.toLocaleString("en-IN")} units sold
                      </p>
                    </div>

                    {/* Stock pill */}
                    <div>
                      {isOut ? (
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-500/20">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
                          {item.stockQuantity} packs (Low)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                          {item.stockQuantity} In Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
