"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SnackCard, type SnackCardVariant } from "@/components/storefront/cards/SnackCard";
import { useAddToCart } from "@/features/cart/hooks/use-cart";
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistedUnitPriceIds,
} from "@/features/wishlist/hooks/use-wishlist";
import { toast } from "@/components/ui/Toast";
import type { CustomerVariantListItemDto } from "../../types/catalog.types";
import { resolveSnackFallbackImage } from "@/lib/storefront";
import { formatMeasurementLabel } from "@/features/variants/utils/measurement.util";

export interface CustomerVariantCardProps {
  variant: CustomerVariantListItemDto;
}

export function CustomerVariantCard({ variant }: CustomerVariantCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { wishlistedIds } = useWishlistedUnitPriceIds({ enabled: !!session });
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  // Convert variant.unitPrices to SnackCardVariant[]
  const packVariants: SnackCardVariant[] = React.useMemo(() => {
    return (variant.unitPrices || []).map((up) => {
      const label =
        typeof up.measurement === "string"
          ? up.measurement
          : formatMeasurementLabel(up.measurement as any) || "Standard";

      return {
        id: up.id,
        label,
        price: up.sellingPrice,
        comparePrice: up.basePrice > up.sellingPrice ? up.basePrice : null,
        inStock: !variant.outOfStock,
        isDefault: Boolean(up.isDefault),
      };
    });
  }, [variant.unitPrices, variant.outOfStock]);

  const defaultUnit = variant.unitPrices?.find((u) => u.isDefault) || variant.unitPrices?.[0];
  const [selectedUnitPriceId, setSelectedUnitPriceId] = React.useState(
    defaultUnit?.id || packVariants[0]?.id || ""
  );

  React.useEffect(() => {
    const defaultId = variant.unitPrices?.find((u) => u.isDefault)?.id || variant.unitPrices?.[0]?.id;
    if (defaultId) {
      setSelectedUnitPriceId(defaultId);
    }
  }, [variant.unitPrices]);


  const activeUnitPriceId = selectedUnitPriceId || packVariants[0]?.id;
  const isWishlisted = Boolean(activeUnitPriceId && wishlistedIds.has(activeUnitPriceId));

  const requireLogin = () => {
    const returnUrl =
      typeof window !== "undefined" ? window.location.pathname : "/products";
    router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleWishlistToggle = (unitPriceId?: string) => {
    if (!session) return requireLogin();
    const targetId = unitPriceId || activeUnitPriceId;
    if (!targetId) return;

    if (wishlistedIds.has(targetId)) {
      removeFromWishlist.mutate(targetId, {
        onSuccess: () => toast.success("Removed from wishlist", variant.variantName),
        onError: () => toast.error("Could not remove from wishlist"),
      });
    } else {
      addToWishlist.mutate(targetId, {
        onSuccess: () => toast.success("Added to wishlist", variant.variantName),
        onError: () => toast.error("Could not add to wishlist"),
      });
    }
  };

  const handleAddToCart = (unitPriceId?: string) => {
    if (!session) return requireLogin();
    const targetId = unitPriceId || activeUnitPriceId;
    if (!targetId) return;

    addToCart.mutate(
      { variantUnitPriceId: targetId, quantity: 1 },
      {
        onSuccess: () => toast.success("Added to cart", variant.variantName),
        onError: () => toast.error("Could not add item to cart"),
      }
    );
  };

  const isDummyLogo =
    variant.primaryImage?.startsWith("/logos/") && variant.primaryImage?.endsWith(".png");
  const displayImage =
    !isDummyLogo && variant.primaryImage
      ? variant.primaryImage
      : resolveSnackFallbackImage(variant.variantName || variant.productName || "");

  return (
    <SnackCard
      id={variant.id}
      name={variant.variantName}
      subtitle={variant.productName || "Rithu's Snacks"}
      image={displayImage}
      href={`/products/${variant.productId}?variant=${variant.id}`}
      variants={packVariants}
      fallbackPrice={variant.salePrice || variant.basePrice}
      selectedVariantId={activeUnitPriceId}
      onVariantChange={setSelectedUnitPriceId}
      isWishlisted={isWishlisted}
      onWishlistToggle={handleWishlistToggle}
      onAddToCart={handleAddToCart}
      isLoading={addToCart.isPending}
      isFeatured={variant.isFeatured}
    />
  );
}

export default CustomerVariantCard;
