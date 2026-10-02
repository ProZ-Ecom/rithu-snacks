"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SnackCard, type SnackCardVariant } from "@/components/storefront/cards/SnackCard";
import { formatPrice } from "@/lib/utils";
import { useAddToCart } from "@/features/cart/hooks/use-cart";
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistedUnitPriceIds,
} from "@/features/wishlist/hooks/use-wishlist";
import { toast } from "@/components/ui/Toast";
import type { CustomerProductListItemDto } from "../../types/catalog.types";

export interface CustomerProductCardProps {
  product: CustomerProductListItemDto;
}

export function CustomerProductCard({ product }: CustomerProductCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { wishlistedIds } = useWishlistedUnitPriceIds({ enabled: !!session });
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  // Convert product.unitPrices to SnackCardVariant[]
  const variants: SnackCardVariant[] = React.useMemo(() => {
    return (product.unitPrices || []).map((up) => ({
      id: up.id,
      label: up.label,
      price: up.sellingPrice,
      comparePrice: up.basePrice > up.sellingPrice ? up.basePrice : null,
      inStock: true,
      isDefault: Boolean((up as any).isDefault),
    }));
  }, [product.unitPrices]);

  const defaultUnit = product.unitPrices?.find((u: any) => u.isDefault) || product.unitPrices?.[0];
  const [selectedVariantId, setSelectedVariantId] = React.useState(
    defaultUnit?.id || variants[0]?.id || ""
  );

  React.useEffect(() => {
    const defaultId = product.unitPrices?.find((u: any) => u.isDefault)?.id || product.unitPrices?.[0]?.id;
    if (defaultId) {
      setSelectedVariantId(defaultId);
    }
  }, [product.unitPrices]);


  const activeVariantId = selectedVariantId || variants[0]?.id;
  const isWishlisted = Boolean(activeVariantId && wishlistedIds.has(activeVariantId));

  const isPriceRange =
    product.minPrice !== product.maxPrice && product.maxPrice > product.minPrice;
  const priceRangeText = isPriceRange
    ? `${formatPrice(product.minPrice)} – ${formatPrice(product.maxPrice)}`
    : undefined;

  const requireLogin = () => {
    const returnUrl =
      typeof window !== "undefined" ? window.location.pathname : "/products";
    router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleWishlistToggle = (variantId?: string) => {
    if (!session) return requireLogin();
    const targetId = variantId || activeVariantId;
    if (!targetId) return;

    if (wishlistedIds.has(targetId)) {
      removeFromWishlist.mutate(targetId, {
        onSuccess: () => toast.success("Removed from wishlist", product.name),
        onError: () => toast.error("Could not remove from wishlist"),
      });
    } else {
      addToWishlist.mutate(targetId, {
        onSuccess: () => toast.success("Added to wishlist", product.name),
        onError: () => toast.error("Could not add to wishlist"),
      });
    }
  };

  const handleAddToCart = (variantId?: string) => {
    if (!session) return requireLogin();
    const targetId = variantId || activeVariantId;
    if (!targetId) return;

    addToCart.mutate(
      { variantUnitPriceId: targetId, quantity: 1 },
      {
        onSuccess: () => toast.success("Added to cart", product.name),
        onError: () => toast.error("Could not add item to cart"),
      }
    );
  };

  return (
    <SnackCard
      id={product.id}
      name={product.name}
      image={product.image}
      href={`/products/${product.id}`}
      variants={variants}
      fallbackPrice={product.minPrice}
      priceRangeText={priceRangeText}
      selectedVariantId={activeVariantId}
      onVariantChange={setSelectedVariantId}
      isWishlisted={isWishlisted}
      onWishlistToggle={handleWishlistToggle}
      onAddToCart={handleAddToCart}
      isLoading={addToCart.isPending}
    />
  );
}

export default CustomerProductCard;
