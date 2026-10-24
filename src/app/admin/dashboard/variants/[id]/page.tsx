"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useVariant,
  useVariants,
  useVariantImages,
  useVariantUnitPrices,
  useUpdateVariant,
  useDeleteVariant,
  useSetPrimaryVariantImage,
  useDeleteVariantImage,
} from "@/features/variants/hooks";
import { toast } from "@/components/ui/Toast";
import { useUnits } from "@/features/units/hooks";
import { AdminDetailSkeleton } from "@/components/admin/AdminDetailSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ExpandableRichText } from "@/components/ui/expandable-rich-text";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/Switch";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  VariantForm,
  VariantImageUploader,
  VariantCard,
  VariantCustomerPreviewModal,
  VariantPriceHistoryCard,
  VariantReviewsCard,
  VariantUnitPriceList,
} from "@/features/variants/components";
import type { UnitFormItem } from "@/features/variants/components/VariantForm";
import type { AdminVariantResponse } from "@/features/variants/types";
import {
  Package,
  Pencil,
  Upload,
  Plus,
  Trash2,
  ImageIcon,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";

function renderDietaryBadge(vegType?: string | null) {
  const type = (vegType || "na").toLowerCase();
  let label = "Vegetarian";
  let markBorder = "border-success-600";
  let markBg = "bg-success-600";

  if (type === "nonveg" || type === "non-veg") {
    label = "Non-vegetarian";
    markBorder = "border-error-600";
    markBg = "bg-error-600";
  } else if (type === "vegan") {
    label = "Vegan";
    markBorder = "border-success-700";
    markBg = "bg-success-700";
  } else if (type === "na" || !vegType) {
    label = "Not Assigned";
    markBorder = "border-neutral-400";
    markBg = "bg-neutral-400";
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-200 text-neutral-700 text-xs font-bold border border-cream-border-subtle">
      <span className={`w-3 h-3 rounded-[2px] border-[1.5px] ${markBorder} flex items-center justify-center`}>
        <span className={`w-1.5 h-1.5 rounded-full ${markBg}`} />
      </span>
      <span>{label}</span>
    </span>
  );
}

export default function AdminVariantDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = params?.id ? decodeURIComponent(params.id) : "";
  const variantId = rawId && rawId !== "undefined" ? rawId : "";
  const productIdParam = searchParams.get("productId") || "";

  // 1. Fallback Query if productId was not passed in search params
  const { data: variantsListResponse, isLoading: isLoadingList } = useVariants(
    !productIdParam && variantId ? { search: variantId, pageSize: 1 } : undefined,
    { enabled: !productIdParam && Boolean(variantId) }
  );

  const foundVariant = variantsListResponse?.data?.find(
    (v: AdminVariantResponse) => v.id === variantId || v.sku === variantId
  );

  const canonicalProductUuid =
    productIdParam || foundVariant?.productId || "";

  // 2. Main Variant Query
  const {
    data: variantResponse,
    isLoading: isLoadingVariant,
    error: variantError,
    refetch: refetchVariant,
  } = useVariant(canonicalProductUuid || null, variantId || null);

  const variant: AdminVariantResponse | null =
    (variantResponse as any)?.data ?? variantResponse ?? foundVariant ?? null;

  // 3. Variant Images Query
  const {
    data: images = [],
    isLoading: isLoadingImages,
    refetch: refetchImages,
  } = useVariantImages(canonicalProductUuid || null, variantId || null);

  // 3b. Variant Unit Prices Query
  const { data: unitPrices = [] } = useVariantUnitPrices(
    canonicalProductUuid || null,
    variantId || null
  );

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUnitPricesModalOpen, setIsUnitPricesModalOpen] = useState(false);
  const [isImageUploaderOpen, setIsImageUploaderOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [imagePendingDeleteId, setImagePendingDeleteId] = useState<string | null>(null);

  // 4. Reference Units for the Edit Modal
  const { data: unitsData } = useUnits({ pageSize: 100 });
  const units = unitsData?.data ?? [];

  const matchedUnit = useMemo(() => {
    if (!variant?.measurement?.unit || units.length === 0) return null;
    const targetUnit = variant.measurement.unit.trim().toUpperCase();
    return (
      units.find(
        (u: any) =>
          u.code?.toUpperCase() === targetUnit ||
          u.name?.toUpperCase() === targetUnit ||
          u.id === variant.unitId
      ) || null
    );
  }, [units, variant]);

  const resolvedUnitId = variant?.unitId || matchedUnit?.id || "";

  const unitOptions = useMemo<UnitFormItem[]>(
    () =>
      units.map((u: any) => ({
        id: u.id,
        value: u.id,
        label: `${u.name} (${u.code})`,
        name: u.name,
        code: u.code,
        type: u.type,
        conversionFactor: u.conversionFactor ? Number(u.conversionFactor) : 1,
      })),
    [units]
  );

  // Mutation Hooks
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();
  const setPrimaryImageMutation = useSetPrimaryVariantImage();
  const deleteImageMutation = useDeleteVariantImage();

  // Image Handlers
  const handleSetPrimaryImage = async (imageUuid: string) => {
    if (!canonicalProductUuid || !variantId) return;
    try {
      await setPrimaryImageMutation.mutateAsync({
        productUuid: canonicalProductUuid,
        variantUuid: variantId,
        imageUuid,
      });
    } catch (err) {
      console.error("Failed to set primary image", err);
    }
  };

  const handleDeleteImage = async () => {
    if (!canonicalProductUuid || !variantId || !imagePendingDeleteId) return;
    try {
      await deleteImageMutation.mutateAsync({
        productUuid: canonicalProductUuid,
        variantUuid: variantId,
        imageUuid: imagePendingDeleteId,
      });
      setImagePendingDeleteId(null);
    } catch (err) {
      console.error("Failed to delete image", err);
    }
  };

  // Delete Handler
  const handleDeleteVariant = async () => {
    if (!variant || !canonicalProductUuid) return;
    try {
      await deleteVariantMutation.mutateAsync({
        productUuid: canonicalProductUuid,
        variantUuid: variant.id,
      });
      setIsDeleteDialogOpen(false);
      router.push("/admin/dashboard/variants");
    } catch (err) {
      console.error("Failed to delete variant", err);
    }
  };

  // Toggle Active/Inactive Status Handler
  const handleToggleStatus = async () => {
    if (!variant || !canonicalProductUuid) return;
    if (!variant.isActive && unitPrices.length === 0) {
      toast.error(
        "Cannot activate item",
        "Please add at least one unit price before activating this item for customers."
      );
      return;
    }
    try {
      await updateVariantMutation.mutateAsync({
        productUuid: canonicalProductUuid,
        variantUuid: variant.id,
        data: { isActive: !variant.isActive },
      });
      refetchVariant();
    } catch (err: any) {
      console.error("Failed to toggle variant status", err);
      toast.error(
        "Status not changed",
        err?.message || "Please add at least one unit price first."
      );
    }
  };

  // Toggle In Stock / Out of Stock Handler
  const handleToggleStock = async () => {
    if (!variant || !canonicalProductUuid) return;
    try {
      await updateVariantMutation.mutateAsync({
        productUuid: canonicalProductUuid,
        variantUuid: variant.id,
        data: { outOfStock: !variant.outOfStock },
      });
      refetchVariant();
    } catch (err: any) {
      console.error("Failed to toggle variant stock", err);
      toast.error(
        "Stock not changed",
        err?.message || "Failed to update stock status."
      );
    }
  };

  const isLoading =
    (isLoadingVariant && !variant) ||
    (!productIdParam && isLoadingList && !foundVariant);

  if (isLoading) {
    return <AdminDetailSkeleton />;
  }

  if (variantError || !variant) {
    return (
      <ErrorState
        title="Item not found"
        message={
          (variantError as any)?.message ||
          "The requested item could not be located or may have been deleted."
        }
        onRetry={() => {
          refetchVariant();
        }}
      />
    );
  }

  const measurementLabel = variant.measurement
    ? `${variant.measurement.value} ${variant.measurement.unit}`
    : "—";

  const attributes = [
    // { label: "Product Name", value: variant.productName || "—" },
    // { label: "Variant Name", value: variant.variantName || "—" },
    {
      label: "Total Stock (all pack sizes)",
      value: (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            !variant.outOfStock
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {!variant.outOfStock ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>In Stock</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>Out of Stock</span>
            </>
          )}
        </span>
      ),
    },
    {
      label: "Active Status",
      value: (
        <span
          className={`text-xs font-bold ${
            variant.isActive ? "text-emerald-700" : "text-neutral-500"
          }`}
        >
          {variant.isActive
            ? "Active (Available for purchase)"
            : "Inactive (Hidden from catalog)"}
        </span>
      ),
    },
    {
      label: "Created Date",
      value: variant.createdAt
        ? new Date(variant.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "—",
    },
    {
      label: "Last Updated",
      value: variant.updatedAt
        ? new Date(variant.updatedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "—",
    },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-400">
          <Link
            href="/admin/dashboard/variants"
            className="hover:text-secondary-600 transition-colors"
          >
            Items
          </Link>
          <span className="opacity-40">/</span>
          {variant.productName && canonicalProductUuid && (
            <>
              <Link
                href={`/admin/dashboard/products/${canonicalProductUuid}`}
                className="hover:text-secondary-600 transition-colors truncate max-w-[150px] sm:max-w-xs"
              >
                {variant.productName}
              </Link>
              <span className="opacity-40">/</span>
            </>
          )}
          <span className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-md">
            {variant.variantName}
          </span>
        </div>

        <Link
          href="/admin/dashboard/variants"
          className="inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold bg-white border border-cream-border-subtle text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs"
        >
          Back to List
        </Link>
      </div>

      {/* Top Hero / Banner Card */}
      <section className="bg-white border border-cream-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {/* Primary Image Thumbnail */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-cream-100 border border-cream-border overflow-hidden flex items-center justify-center shrink-0">
            {variant.primaryImage ? (
              <Image
                src={variant.primaryImage}
                alt={variant.variantName}
                fill
                sizes="(max-width: 640px) 80px, 96px"
                className="object-cover"
              />
            ) : (
              <Package className="w-8 h-8 text-neutral-400 opacity-60" />
            )}
          </div>

          {/* Title & Metadata */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 truncate">
                {variant.variantName}
              </h1>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  variant.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-cream-200 text-neutral-500 border border-cream-border"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    variant.isActive ? "bg-emerald-600" : "bg-neutral-400"
                  }`}
                />
                {variant.isActive ? "Active" : "Inactive"}
              </span>

              {/* Measurement Badge */}
              {variant.measurement?.value && (
                <span className="px-2.5 py-1 rounded-lg bg-cream-200 text-neutral-700 text-xs font-bold border border-cream-border-subtle">
                  {measurementLabel}
                  {variant.unitPrices.length > 1 && ` +${variant.unitPrices.length - 1} more`}
                </span>
              )}

              {/* Featured Badge */}
              {variant.isFeatured && (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                  Featured
                </span>
              )}

              {/* Dietary Badge */}
              {renderDietaryBadge(variant.vegType)}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-500">
              <span className="font-medium text-neutral-700">
                {variant.productName || "Product"}
              </span>
              <span className="opacity-30">·</span>
              <span className="font-mono text-neutral-600 bg-cream-100 px-2 py-0.5 rounded border border-cream-border">
                SKU: {variant.sku}
              </span>
              <span className="opacity-30">·</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  !variant.outOfStock
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {!variant.outOfStock ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>In Stock</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Out of Stock</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Status Controls + Action Buttons */}
        <div className="flex flex-col gap-3 items-stretch sm:items-end w-full md:w-auto shrink-0 md:pl-6 md:border-l md:border-cream-border">
          {!variant.isActive && unitPrices.length === 0 && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>This item is currently Inactive (hidden from customers). Add unit pricing below to activate it.</span>
            </div>
          )}

          {/* Status Toggle Panel */}
          <div className="flex items-center gap-4 h-9 px-3.5 rounded-lg border border-cream-border bg-cream-50 self-start sm:self-end">
            <label
              className="flex items-center gap-2 cursor-pointer"
              title={variant.isActive ? "Deactivate this variant" : "Activate this variant"}
            >
              <Switch
                checked={variant.isActive}
                onCheckedChange={handleToggleStatus}
                disabled={updateVariantMutation.isPending}
              />
              <span className="text-xs font-bold text-neutral-700 whitespace-nowrap">
                {variant.isActive ? "Active" : "Inactive"}
              </span>
            </label>

            <div className="w-px h-4 bg-cream-border" />

            <label
              className="flex items-center gap-2 cursor-pointer"
              title={variant.outOfStock ? "Mark as in stock" : "Mark as out of stock"}
            >
              <Switch
                checked={!variant.outOfStock}
                onCheckedChange={handleToggleStock}
                disabled={updateVariantMutation.isPending}
              />
              <span className="text-xs font-bold text-neutral-700 whitespace-nowrap">
                {!variant.outOfStock ? "In Stock" : "Out of Stock"}
              </span>
            </label>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="h-9 bg-white border-cream-border text-secondary-700 hover:bg-secondary-50 cursor-pointer"
              title="Storefront Customer View Preview"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-secondary-600" />
              <span>Customer Preview</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUnitPricesModalOpen(true)}
              className="h-9 bg-white border-cream-border text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              <span>Units & Pricing</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="h-9"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              <span>Edit</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="h-9 w-9 text-red-600 hover:bg-red-50"
              title="Delete Variant"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Main 2-Column Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-7): Pricing & Price History Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Price History & Pricing Breakdown Card */}
          <VariantPriceHistoryCard variant={variant} />
        </div>

        {/* Right Column (lg:col-span-5): Images, Item Attributes & Description */}
        <div className="lg:col-span-5 space-y-6">
          {/* Images Card */}
          <div className="bg-white border border-cream-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4.5 border-b border-cream-border flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-secondary-600" />
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                Images
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-200 text-neutral-600 border border-cream-border">
                {images.length || (variant.primaryImage ? 1 : 0)}
              </span>
            </div>

            {/* Images Gallery */}
            {images.length > 0 ? (
              <div className="p-5 grid grid-cols-3 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative aspect-square rounded-xl bg-cream-100 border overflow-hidden group ${
                      img.isPrimary
                        ? "border-2 border-secondary-600 shadow-xs"
                        : "border-cream-border"
                    }`}
                  >
                    <Image
                      src={img.imageUrl}
                      alt={variant.variantName}
                      fill
                      sizes="(max-width: 768px) 33vw, 150px"
                      className="object-cover"
                    />
                    {img.isPrimary ? (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center bg-secondary-600 text-cream-white text-[9px] font-bold tracking-wider uppercase px-1 py-0.5 rounded-md shadow-xs">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(img.id)}
                        disabled={setPrimaryImageMutation.isPending || deleteImageMutation.isPending}
                        title="Set as primary image"
                        className={`absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1 rounded-md bg-black/70 hover:bg-secondary-600 text-cream-white text-[9px] font-bold tracking-wider uppercase px-1 py-0.5 transition-opacity cursor-pointer disabled:cursor-not-allowed ${
                          setPrimaryImageMutation.isPending &&
                          setPrimaryImageMutation.variables?.imageUuid === img.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {setPrimaryImageMutation.isPending &&
                        setPrimaryImageMutation.variables?.imageUuid === img.id ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Setting...
                          </>
                        ) : (
                          <>
                            <Star className="w-2.5 h-2.5" />
                            Set Primary
                          </>
                        )}
                      </button>
                    )}
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => setImagePendingDeleteId(img.id)}
                        disabled={setPrimaryImageMutation.isPending || deleteImageMutation.isPending}
                        aria-label="Delete image"
                        title="Delete image"
                        className="absolute top-1.5 right-1.5 rounded-lg bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Image Tile */}
                <button
                  type="button"
                  onClick={() => setIsImageUploaderOpen(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-cream-border-hover hover:border-secondary-600 hover:bg-cream-100 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-secondary-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Add Image</span>
                </button>
              </div>
            ) : variant.primaryImage ? (
              <div className="p-5 grid grid-cols-3 gap-3">
                <div className="relative aspect-square rounded-xl bg-cream-100 border-2 border-secondary-600 overflow-hidden shadow-xs">
                  <Image
                    src={variant.primaryImage}
                    alt={variant.variantName}
                    fill
                    sizes="(max-width: 768px) 33vw, 150px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center bg-secondary-600 text-cream-white text-[9px] font-bold tracking-wider uppercase px-1 py-0.5 rounded-md shadow-xs">
                    Primary
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsImageUploaderOpen(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-cream-border-hover hover:border-secondary-600 hover:bg-cream-100 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-secondary-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Add Image</span>
                </button>
              </div>
            ) : (
              <div className="py-12 px-6 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center text-neutral-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">
                    No images uploaded yet
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Upload square photos (500 × 500 px)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImageUploaderOpen(true)}
                  className="mt-1"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Upload Images</span>
                </Button>
              </div>
            )}
          </div>

          {/* Variant Attributes Technical Specifications Card */}
          {/* <div className="bg-white border border-cream-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4.5 border-b border-cream-border">
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-secondary-600" />
                <span>Item attributes</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                General details for this item. Pack sizes, SKU codes and pricing are managed in
                "Units & Pricing" above.
              </p>
            </div>

            <div className="divide-y divide-cream-border-subtle">
              {attributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-6 py-3.5 items-center hover:bg-cream-50 transition-colors"
                >
                  <span className="sm:col-span-5 text-xs font-medium text-neutral-400">
                    {attr.label}
                  </span>
                  <div className="sm:col-span-7 text-xs sm:text-sm font-semibold text-neutral-900">
                    {attr.value}
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Description Card */}
          <div className="bg-white border border-cream-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4.5 border-b border-cream-border flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                Description
              </h2>
            </div>
            <div className="p-6">
              {variant.shortDescription || variant.description ? (
                <div className="space-y-4 min-w-0">
                  {variant.shortDescription && (
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Summary
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {variant.shortDescription}
                      </p>
                    </div>
                  )}

                  {variant.description && (
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Full Description
                      </div>
                      <ExpandableRichText
                        html={variant.description}
                        className="text-xs sm:text-sm text-neutral-600 break-words [overflow-wrap:anywhere]"
                        toggleClassName="mt-1.5 text-xs font-bold text-secondary-600 hover:underline cursor-pointer inline-block"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4 text-center flex flex-col items-center gap-2">
                  <p className="text-xs sm:text-sm font-semibold text-neutral-700">
                    No description yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="mt-1 border border-cream-border-subtle bg-white text-secondary-600 hover:bg-secondary-50 hover:border-secondary-200 text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Add description
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ingredients / Recipe / Best Before Card */}
          <div className="bg-white border border-cream-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4.5 border-b border-cream-border flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                Ingredients &amp; Recipe
              </h2>
            </div>
            <div className="p-6">
              {variant.ingredients ||
              (variant.isReadyToMix && variant.cookingRecipe) ||
              variant.shelfLife ? (
                <div className="space-y-4">
                  {variant.ingredients && (
                    <div>
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Ingredients
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {variant.ingredients}
                      </p>
                    </div>
                  )}

                  {variant.isReadyToMix && variant.cookingRecipe && (
                    <div>
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Cooking Recipe
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {variant.cookingRecipe}
                      </p>
                    </div>
                  )}

                  {variant.shelfLife && (
                    <div>
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Best Before
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                        {variant.shelfLife}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4 text-center flex flex-col items-center gap-2">
                  <p className="text-xs sm:text-sm font-semibold text-neutral-700">
                    No ingredients or recipe added yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="mt-1 border border-cream-border-subtle bg-white text-secondary-600 hover:bg-secondary-50 hover:border-secondary-200 text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Add ingredients / recipe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews & Ratings Section for this Variant */}
      <section>
        <VariantReviewsCard variant={variant} />
      </section>

      {/* 1. Edit Variant Details Modal */}
      <FormModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Variant Details"
        description={`Update information and configuration for ${variant.variantName}`}
        size="lg"
      >
        <VariantForm
          initialData={{
            variantName: variant.variantName,
            slug: variant.slug || "",
            shortDescription: variant.shortDescription || "",
            description: variant.description || "",
            ingredients: variant.ingredients || "",
            isReadyToMix: variant.isReadyToMix ?? false,
            cookingRecipe: variant.cookingRecipe || "",
            shelfLife: variant.shelfLife || "",
            vegType: variant.vegType || "na",
            isFeatured: variant.isFeatured ?? false,
          }}
          isEditing
          fixedProductId={canonicalProductUuid}
          fixedProductSlug={variant.productSlug}
          isLoading={updateVariantMutation.isPending}
          submitLabel="Save Changes"
          onSubmit={async (formData) => {
            try {
              await updateVariantMutation.mutateAsync({
                productUuid: canonicalProductUuid,
                variantUuid: variant.id,
                data: {
                  variantName: formData.variantName,
                  slug: formData.slug,
                  shortDescription: formData.shortDescription || null,
                  description: formData.description || null,
                  ingredients: formData.ingredients || null,
                  isReadyToMix: formData.isReadyToMix,
                  cookingRecipe: formData.cookingRecipe || null,
                  shelfLife: formData.shelfLife || null,
                  vegType: formData.vegType,
                  isFeatured: formData.isFeatured,
                },
              });
              setIsEditModalOpen(false);
              refetchVariant();
            } catch (err) {
              console.error("Failed to update variant", err);
            }
          }}
        />
      </FormModal>

      {/* 1b. Manage Units & Pricing Modal */}
      <FormModal
        open={isUnitPricesModalOpen}
        onClose={() => setIsUnitPricesModalOpen(false)}
        title={`Units & Pricing: ${variant.variantName}`}
        description="Manage the unit + price combinations this item can be purchased in"
        size="lg"
      >
        <VariantUnitPriceList
          productUuid={canonicalProductUuid}
          variantUuid={variant.id}
        />
      </FormModal>

      {/* 2. Manage Images Modal */}
      <FormModal
        open={isImageUploaderOpen}
        onClose={() => setIsImageUploaderOpen(false)}
        title={`Manage Images: ${variant.variantName}`}
        description="Upload and crop product variant photos (500 × 500 px)"
        size="lg"
      >
        <VariantImageUploader
          productUuid={canonicalProductUuid}
          variantUuid={variant.id}
          variantName={variant.variantName}
          onFinish={() => {
            setIsImageUploaderOpen(false);
            refetchImages();
            refetchVariant();
          }}
        />
      </FormModal>

      {/* 3. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteVariant}
        title="Delete Variant"
        description={`Are you sure you want to delete the variant "${variant.variantName}" (${variant.sku})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteVariantMutation.isPending}
      />

      {/* 3b. Delete Image Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(imagePendingDeleteId)}
        onClose={() => setImagePendingDeleteId(null)}
        onConfirm={handleDeleteImage}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteImageMutation.isPending}
      />

      {/* 4. Customer View Live Card Preview Modal */}
      <VariantCustomerPreviewModal
        variant={variant}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}
