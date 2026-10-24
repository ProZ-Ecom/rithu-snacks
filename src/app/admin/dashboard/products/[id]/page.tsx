"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Package,
  Layers,
  Tag,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  IndianRupee,
  Check,
  CheckCircle2,
  ExternalLink,
  Download,
  Plus,
  X,
  Clock,
  ArrowDownRight,
  Filter,
  MoreHorizontal,
  Power,
  PowerOff,
  Images as ImagesIcon,
  LayoutList,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { variantKeys } from "@/lib/api/query-keys";
import { updateAdminVariant } from "@/features/variants/api/get-variants";
import { useAdminProduct, useProductImages } from "@/features/products/hooks";
import {
  useVariants,
  useVariantUnitPrices,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from "@/features/variants/hooks";
import { useUpdateProduct } from "@/features/products/hooks/use-product-mutations";
import { useCategories } from "@/features/categories/hooks";
import { useBrands } from "@/features/brands/hooks";
import { useHsnCodes } from "@/features/hsn-codes/hooks";
import { useUnits } from "@/features/units/hooks";
import { ProductPriceEditModal } from "@/features/products/components/ProductPriceEditModal";
import { ProductForm, type ProductFormValues } from "@/features/products/components/ProductForm";
import {
  VariantForm,
  VariantImageUploader,
  VariantCard,
  VariantCustomerPreviewModal,
  VariantUnitPriceList,
  type VariantFormValues,
  type UnitFormItem,
} from "@/features/variants/components";
import { AdminDetailSkeleton } from "@/components/admin/AdminDetailSkeleton";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AdminVariantResponse } from "@/features/variants/types";

type VariantFilter = "all" | "active" | "inactive";

function formatMeasurement(m: any): string {
  if (!m) return "—";
  if (typeof m === "string") return m;
  if (typeof m === "object" && "value" in m && "unit" in m) {
    return `${m.value} ${m.unit}`.trim() || "—";
  }
  return "—";
}

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
  } else if (type === "egg" || type === "contains egg") {
    label = "Contains egg";
    markBorder = "border-amber-600";
    markBg = "bg-amber-600";
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

export default function AdminProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id ? decodeURIComponent(params.id) : "";
  const productId = rawId && rawId !== "undefined" ? rawId : "";

  // 1. Main Product Query
  const {
    data: productResponse,
    isLoading: isLoadingProduct,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useAdminProduct(productId);

  const product: any = (productResponse as any)?.data ?? productResponse;

  const isUuid = (val?: string): val is string =>
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // Safely determine the product UUID so we never send invalid non-UUID strings to the backend API
  const productUuid:string| null = isUuid(product?.id)
    ? product.id
    : isUuid(productId)
    ? productId
    : undefined;

  const canonicalProductId = productUuid || product?.id || productId;

  // Filter & Selection State (All by default so items stay visible as inactive when deactivated)
  const [variantFilter, setVariantFilter] = React.useState<VariantFilter>("all");
  const [variantViewMode, setVariantViewMode] = React.useState<"table" | "cards">("table");
  const [previewVariant, setPreviewVariant] = React.useState<AdminVariantResponse | null>(null);

  // 2. Product Variants Query using the POST "Get All Variants" API (POST /api/admin/variants)
  // Queries variants for this product based on the active tab (all, active, or inactive)
  const {
    data: variantsResponse,
    isLoading: isLoadingVariants,
    refetch: refetchVariants,
  } = useVariants(
    productUuid
      ? {
          productIds: [productUuid],
          isActive:
            variantFilter === "active"
              ? true
              : variantFilter === "inactive"
              ? false
              : undefined,
          pageSize: 100,
          page: 1,
        }
      : undefined,
    { enabled: !!productUuid }
  );

  const variants = React.useMemo<AdminVariantResponse[]>(() => {
    return (variantsResponse?.data as AdminVariantResponse[]) ?? [];
  }, [variantsResponse]);

  // Reference queries for modal form dropdowns (lazy-loaded when modals open)
  const [isEditProductOpen, setIsEditProductOpen] = React.useState(false);
  const [isAddVariantOpen, setIsAddVariantOpen] = React.useState(false);
  const [newlyCreatedVariant, setNewlyCreatedVariant] = React.useState<AdminVariantResponse | null>(null);
  const [editingVariant, setEditingVariant] = React.useState<AdminVariantResponse | null>(null);
  const [editVariantTab, setEditVariantTab] = React.useState<"details" | "pricing">("details");
  const [deletingVariant, setDeletingVariant] = React.useState<AdminVariantResponse | null>(null);
  const [variantToDeactivate, setVariantToDeactivate] = React.useState<AdminVariantResponse | null>(null);
  const [variantToActivate, setVariantToActivate] = React.useState<AdminVariantResponse | null>(null);
  const [managingImagesVariant, setManagingImagesVariant] = React.useState<AdminVariantResponse | null>(null);
  const [activeMenu, setActiveMenu] = React.useState<{
    variant: AdminVariantResponse;
    rect: DOMRect;
  } | null>(null);
  const queryClient = useQueryClient();
  const [isStatusUpdating, setIsStatusUpdating] = React.useState(false);
  const [isPriceEditOpen, setIsPriceEditOpen] = React.useState(false);
  const [bulkStatusAction, setBulkStatusAction] = React.useState<{
    targetActive: boolean;
    count: number;
  } | null>(null);

  // Close action dropdown menu when clicking outside, scrolling, or pressing Escape
  React.useEffect(() => {
    if (!activeMenu) return;

    const handleClose = () => setActiveMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenu(null);
    };

    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-action-portal]") && !target.closest("[data-action-trigger]")) {
        setActiveMenu(null);
      }
    });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu]);

  const isAnyFormOpen = isEditProductOpen || isAddVariantOpen || !!editingVariant;

  const { data: categoriesData } = useCategories(
    { pageSize: 100 },
    { enabled: isEditProductOpen }
  );
  const { data: brandsData } = useBrands(
    { limit: 100 },
    { enabled: isEditProductOpen }
  );
  const { data: hsnData } = useHsnCodes(
    { pageSize: 100 },
    { enabled: isEditProductOpen }
  );
  const { data: unitsData } = useUnits(
    { pageSize: 100 }
  );

  // Mutations
  const updateProductMutation = useUpdateProduct();
  const createVariantMutation = useCreateVariant();
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();

  // Product Images Query (product carries at most one image)
  const { data: productImages = [] } = useProductImages(productUuid || null);

  // Unit prices for newly created variant in modal
  const { data: newlyCreatedPrices = [] } = useVariantUnitPrices(
    canonicalProductId || null,
    newlyCreatedVariant?.id || null
  );
  const hasNewlyCreatedPrices = newlyCreatedPrices.length > 0;

  // Selection State
  const [selectedVariants, setSelectedVariants] = React.useState<Record<string, boolean>>({});

  // Labels from product response
  const categoryName = product?.categoryName || product?.category?.name || null;
  const brandName = product?.brandName || product?.brand?.name || null;
  const hsnCodeInfo =
    product?.hsnCodeName ||
    (product?.product_hsn_codes?.code
      ? `${product.product_hsn_codes.code}${
          product.product_hsn_codes.description
            ? ` (${product.product_hsn_codes.description})`
            : ""
        }`
      : null) ||
    (product?.hsnCode?.code
      ? `${product.hsnCode.code}${
          product.hsnCode.description ? ` (${product.hsnCode.description})` : ""
        }`
      : null) ||
    (typeof product?.hsnCode === "string" ? product.hsnCode : null);

  const currentTabCount = variantsResponse?.meta?.total ?? variants.length;

  // Selection helpers
  const selectedIds = React.useMemo(
    () => Object.keys(selectedVariants).filter((id) => selectedVariants[id]),
    [selectedVariants]
  );
  const selectedObjs = React.useMemo(
    () => variants.filter((v) => selectedVariants[v.id]),
    [variants, selectedVariants]
  );
  const hasSelection = selectedIds.length > 0;
  const hasActiveSelected = selectedObjs.some((v) => v.isActive);
  const hasInactiveSelected = selectedObjs.some((v) => !v.isActive);
  const isAllSelected =
    variants.length > 0 &&
    variants.every((v) => selectedVariants[v.id]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVariants({});
    } else {
      const next: Record<string, boolean> = {};
      variants.forEach((v) => {
        next[v.id] = true;
      });
      setSelectedVariants(next);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Export Variants to CSV
  const handleExportVariants = () => {
    if (variants.length === 0) {
      return;
    }

    const headers = [
      "Item ID",
      "Item Name",
      "Default SKU",
      "Default Pack Size",
      "Default Price",
      "Status",
      "Last Updated",
    ];

    const rows = variants.map((v) => [
      `"${v.id}"`,
      `"${v.variantName.replace(/"/g, '""')}"`,
      `"${v.sku ?? ""}"`,
      `"${formatMeasurement(v.measurement)}"`,
      v.basePrice ?? "",
      v.isActive ? "Active" : "Inactive",
      v.updatedAt ? new Date(v.updatedAt).toISOString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product?.slug || "product"}-variants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Make Variant Inactive (from Active tab)
  const handleMakeInactive = async (variant: AdminVariantResponse) => {
    setIsStatusUpdating(true);
    try {
      await updateVariantMutation.mutateAsync({
        productUuid: canonicalProductId,
        variantUuid: variant.id,
        data: { isActive: false },
      });
      setVariantToDeactivate(null);
    } catch (err: any) {
      console.error("Failed to make item inactive", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Make Variant Active (from Inactive tab)
  const handleMakeActive = async (variant: AdminVariantResponse) => {
    setIsStatusUpdating(true);
    try {
      await updateVariantMutation.mutateAsync({
        productUuid: canonicalProductId,
        variantUuid: variant.id,
        data: { isActive: true },
      });
      setVariantToActivate(null);
    } catch (err: any) {
      console.error("Failed to activate item", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Bulk status update
  const handleBulkStatusChange = async (targetActive: boolean) => {
    if (!hasSelection || isStatusUpdating) return;
    const targets = selectedObjs.filter((obj) => obj.isActive !== targetActive);
    if (targets.length === 0) return;

    setIsStatusUpdating(true);
    try {
      await Promise.all(
        targets.map((obj) =>
          updateAdminVariant(canonicalProductId, obj.id, { isActive: targetActive })
        )
      );
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "variants"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["customer", "catalog"] });

      toast.success(
        targetActive ? "Items Activated" : "Items Deactivated",
        `${targets.length} item${targets.length > 1 ? "s" : ""} ${
          targetActive ? "activated" : "deactivated"
        } successfully.`
      );
      setSelectedVariants({});
    } catch (err: any) {
      console.error("Bulk update failed", err);
      toast.error(
        "Bulk update failed",
        err instanceof Error ? err.message : "Failed to update selected items"
      );
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Stats (Dummy data)
  const stats = React.useMemo(() => {
    const lastUpdatedDate = product?.updatedAt
      ? new Date(product.updatedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

    const lastUpdatedTime = product?.updatedAt
      ? new Date(product.updatedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

    return {
      priceRange: "₹100 – ₹500",
      priceRangeNote: "Across variants",
      avgDiscount: "10%",
      avgDiscountNote: "Standard discount",
      lastUpdatedDate,
      lastUpdatedTime,
    };
  }, [product]);

  // Options for Dropdowns
  const categoryOptions = React.useMemo(
    () => (categoriesData?.data ?? []).map((c: any) => ({ value: c.id || c.uuid, label: c.name, slug: c.slug })),
    [categoriesData]
  );
  const brandOptions = React.useMemo(
    () => (brandsData?.data ?? []).map((b: any) => ({ value: b.uuid || b.id, label: b.name, slug: b.slug })),
    [brandsData]
  );
  const hsnOptions = React.useMemo(
    () =>
      (hsnData?.data ?? []).map((h: any) => ({
        value: h.id,
        label: `${h.code}${h.description ? ` (${h.description})` : ""}`,
      })),
    [hsnData]
  );
  const unitOptions = React.useMemo<UnitFormItem[]>(
    () =>
      (unitsData?.data ?? []).map((u: any) => ({
        id: u.id,
        value: u.id,
        label: `${u.name} (${u.code})`,
        name: u.name,
        code: u.code,
        type: u.type,
        conversionFactor: u.conversionFactor ? Number(u.conversionFactor) : 1,
      })),
    [unitsData]
  );

  // Resolve product thumbnail
  const primaryProductImage =
    productImages.find((img) => img.isPrimary)?.imageUrl ||
    productImages[0]?.imageUrl ||
    variants.find((v) => v.primaryImage)?.primaryImage ||
    null;

  if (isLoadingProduct && !product) {
    return <AdminDetailSkeleton />;
  }

  if (isProductError || !product) {
    return (
      <ErrorState
        message={
          (productError as any)?.message ||
          "Failed to load product details. Product not found or inactive."
        }
        onRetry={() => refetchProduct()}
      />
    );
  }

  return (
    <div className="w-full space-y-4 text-neutral-900">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-400 pb-1">
        <Link
          href="/admin/dashboard/products"
          className="hover:text-secondary-800 transition-colors"
        >
          Products
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-md">
          {product.name}
        </span>
      </div>

      {/* Section 1: Hero Overview + Specifications Card */}
        <section className="bg-white border border-cream-border rounded-lg overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4 items-center min-w-0">
            {/* Product Image Thumbnail */}
            <div className="w-[84px] h-[84px] rounded-lg flex-none bg-cream-100 border border-cream-border relative overflow-hidden flex items-center justify-center">
              {primaryProductImage ? (
                <Image
                  src={primaryProductImage}
                  alt={product.name}
                  fill
                  sizes="84px"
                  className="object-cover"
                />
              ) : (
                <div className="text-center">
                  <Package className="w-6 h-6 text-neutral-400 mx-auto mb-1 opacity-70" />
                  <span className="font-mono text-[9px] text-neutral-400 block leading-tight">
                    product<br />shot
                  </span>
                </div>
              )}
            </div>

            {/* Title & Badges */}
            <div className="min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {product.name}
                </h1>
                {/* Active/Inactive badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                    product.isActive
                      ? "bg-success-50 text-success-700"
                      : "bg-cream-200 text-neutral-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      product.isActive ? "bg-success-600" : "bg-neutral-400"
                    }`}
                  />
                  {product.isActive ? "Active" : "Inactive"}
                </span>

              </div>

              {/* Category · Brand · Slug · HSN · Created subline */}
              <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm text-neutral-500">
                <span>{categoryName || "Not Assigned"}</span>
                <span className="opacity-40">·</span>
                <span>{brandName || "Not Assigned"}</span>
                <span className="opacity-40">·</span>
                <span className="font-mono text-xs text-neutral-700 bg-cream-100 px-1.5 py-0.5 rounded-sm border border-cream-border">
                  {product.slug || "NO_SLUG"}
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <span className="text-neutral-400">HSN</span>{" "}
                  <span className="font-semibold text-neutral-700">
                    {hsnCodeInfo || "Not Assigned"}
                  </span>
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <span className="text-neutral-400">Created</span>{" "}
                  <span className="font-semibold text-neutral-700">
                    {product.createdAt
                      ? new Date(product.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5 flex-none w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsEditProductOpen(true)}
              className="px-3.5 py-1.5 rounded-md border border-secondary-700 bg-secondary-600 hover:bg-secondary-700 text-cream-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
          </div>
        </section>

        {/* Section 2: Stats Cards Grid (3 Cards) */}
        {/* <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white border border-cream-border rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Price Range
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {stats.priceRange}
            </div>
            <div className="text-xs text-neutral-400">{stats.priceRangeNote}</div>
          </div>

          <div className="bg-white border border-cream-border rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Variants Status
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <span className="text-success-700"> Active</span>
              <span className="text-neutral-400 text-base font-normal">/</span>
              <span className="text-neutral-500">Inactive</span>
            </div>
          </div>

          <div className="bg-white border border-cream-border rounded-2xl p-4 sm:p-5 flex flex-col gap-1.5 shadow-xs">
            <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              Last Updated
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {stats.lastUpdatedDate}
            </div>
            <div className="text-xs text-neutral-400">{stats.lastUpdatedTime || "Recent"}</div>
          </div>
        </section> */}

        {/* Section 4: Product Variants Section with FIXED ACTION COLUMN */}
        <section className="bg-white border border-cream-border rounded-lg overflow-hidden">
          {/* Header & Controls */}
          <div className="p-3.5 sm:p-4 border-b border-cream-border flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Title, Counter Badge & Segmented Filter Tabs */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                  Product Items
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cream-200 border border-cream-border text-xs font-bold text-neutral-500">
                  {currentTabCount}
                </span>
              </div>

              {/* Filter Tabs with Count Pills */}
              <div className="flex p-1 bg-cream-200 border border-cream-border rounded-md gap-1">
                <button
                  type="button"
                  onClick={() => setVariantFilter("all")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    variantFilter === "all"
                      ? "bg-secondary-600 text-cream-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
                  }`}
                >
                  <span>All</span>
                  {variantFilter === "all" && (
                    <span className="px-1.5 py-0.5 text-[10.5px] rounded-full font-bold leading-none bg-white/20 text-cream-white">
                      {currentTabCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setVariantFilter("active")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    variantFilter === "active"
                      ? "bg-secondary-600 text-cream-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
                  }`}
                >
                  <span>Active</span>
                  {variantFilter === "active" && (
                    <span className="px-1.5 py-0.5 text-[10.5px] rounded-full font-bold leading-none bg-white/20 text-cream-white">
                      {currentTabCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setVariantFilter("inactive")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    variantFilter === "inactive"
                      ? "bg-secondary-600 text-cream-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
                  }`}
                >
                  <span>Inactive</span>
                  {variantFilter === "inactive" && (
                    <span className="px-1.5 py-0.5 text-[10.5px] rounded-full font-bold leading-none bg-white/20 text-cream-white">
                      {currentTabCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Actions (View Mode Switcher, Export, Edit prices, Add variant) */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap justify-end">
              {/* Table / Card View Mode Toggle */}
              <div className="flex items-center bg-cream-200 border border-cream-border p-1 rounded-md">
                <button
                  type="button"
                  onClick={() => setVariantViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                    variantViewMode === "table"
                      ? "bg-secondary-600 text-cream-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
                  }`}
                  title="Table View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariantViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                    variantViewMode === "cards"
                      ? "bg-secondary-600 text-cream-white"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-white"
                  }`}
                  title="Customer Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card View</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPriceEditOpen(true)}
                className="px-3.5 py-1.5 rounded-md border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 text-secondary-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Bulk edit prices"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Edit prices</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddVariantOpen(true)}
                className="px-3.5 py-1.5 rounded-md border border-secondary-700 bg-secondary-600 hover:bg-secondary-700 text-cream-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {hasSelection && variantViewMode === "table" && (
            <div className="px-4 py-2.5 bg-secondary-50 border-b border-secondary-200 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-secondary-600">
                {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariants({})}
                  disabled={isStatusUpdating}
                  className="px-2.5 py-1 rounded-md border border-secondary-200 bg-white hover:bg-secondary-100 text-secondary-600 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inactiveCount = selectedObjs.filter((v) => !v.isActive).length;
                    if (inactiveCount > 0) {
                      setBulkStatusAction({ targetActive: true, count: inactiveCount });
                    }
                  }}
                  disabled={isStatusUpdating || !hasInactiveSelected}
                  className={`px-2.5 py-1 rounded-md border font-semibold transition-all ${
                    hasInactiveSelected && !isStatusUpdating
                      ? "border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 cursor-pointer shadow-2xs"
                      : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const activeCount = selectedObjs.filter((v) => v.isActive).length;
                    if (activeCount > 0) {
                      setBulkStatusAction({ targetActive: false, count: activeCount });
                    }
                  }}
                  disabled={isStatusUpdating || !hasActiveSelected}
                  className={`px-2.5 py-1 rounded-md border font-semibold transition-all ${
                    hasActiveSelected && !isStatusUpdating
                      ? "border-amber-300 bg-white hover:bg-amber-50 text-amber-800 cursor-pointer shadow-2xs"
                      : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-50"
                  }`}
                >
                  Deactivate
                </button>
              </div>
            </div>
          )}

          {/* Variants Rendering: Table vs Cards */}
          {isLoadingVariants ? (
            <AdminTableSkeleton bare rows={4} columns={4} />
          ) : variants.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Package className="mx-auto h-10 w-10 text-neutral-300" />
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                {variantFilter === "all"
                  ? "No Items found"
                  : `No ${variantFilter} Item found`}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                {variantFilter === "all"
                  ? "This product currently has no items associated with it."
                  : variantFilter === "active"
                  ? "This product currently has no active Items associated with it."
                  : "No Items are currently marked as inactive."}
              </p>
              <button
                type="button"
                onClick={() => setIsAddVariantOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-secondary-600 text-cream-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first Item</span>
              </button>
            </div>
          ) : variantViewMode === "cards" ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {variants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  productUuid={canonicalProductId}
                  onEdit={(v) => setEditingVariant(v)}
                  onManageImages={(v) => setManagingImagesVariant(v)}
                  onDelete={(v) => setDeletingVariant(v)}
                  onPreview={(v) => setPreviewVariant(v)}
                  onToggleStatus={(v, nextActive) => {
                    if (nextActive) {
                      setVariantToActivate(v);
                    } else {
                      setVariantToDeactivate(v);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[560px] relative scrollbar-thin">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-30 bg-cream-50 text-[11px] font-bold tracking-wider text-neutral-400 uppercase shadow-[0_1px_0_var(--cream-border)]">
                  <tr>
                    {/* Checkbox */}
                    <th className="px-3.5 py-2.5 w-[44px] min-w-[44px] text-center border-b border-cream-border">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-cream-border-hover text-secondary-600 focus:ring-secondary-600 cursor-pointer"
                      />
                    </th>

                    <th className="px-4 py-2.5 min-w-[200px] border-b border-cream-border">Item</th>
                    <th className="px-4 py-2.5 min-w-[120px] border-b border-cream-border">SKU</th>
                    <th className="px-4 py-2.5 min-w-[150px] border-b border-cream-border">Pack Sizes</th>
                    <th className="px-4 py-2.5 min-w-[140px] border-b border-cream-border">Type</th>
                    <th className="px-4 py-2.5 min-w-[120px] text-right border-b border-cream-border">Price</th>
                    <th className="px-3 py-2.5 min-w-[95px] text-center border-b border-cream-border">Status</th>

                    {/* FIXED ACTION COLUMN (Sticky top & right corner) */}
                    <th className="sticky top-0 right-0 z-40 bg-cream-50 text-center px-2 py-2.5 w-[72px] min-w-[72px] border-b border-cream-border shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05),0_1px_0_var(--cream-border)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-cream-border-subtle bg-white">
                  {variants.map((variant) => {
                    const isPicked = !!selectedVariants[variant.id];
                    const unitPrices = variant.unitPrices ?? [];
                    const priceValues = unitPrices.map((p) => p.basePrice);
                    const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
                    const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
                    const extraSizes = unitPrices.length > 1 ? unitPrices.length - 1 : 0;

                    return (
                      <tr
                        key={variant.id}
                        className={`group transition-colors ${
                          isPicked ? "bg-cream-50" : "hover:bg-cream-50"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3.5 py-2.5 w-[44px] min-w-[44px] text-center">
                          <input
                            type="checkbox"
                            checked={isPicked}
                            onChange={() => toggleSelectOne(variant.id)}
                            className="w-4 h-4 rounded border-cream-border-hover text-secondary-600 focus:ring-secondary-600 cursor-pointer"
                          />
                        </td>

                        {/* Variant Name & Image */}
                        <td className="px-4 py-2.5 min-w-[200px]">
                          <Link
                            href={`/admin/dashboard/variants/${encodeURIComponent(variant.id)}?productId=${encodeURIComponent(canonicalProductId)}`}
                            className="group/variant flex items-center gap-3 min-w-0 hover:opacity-95"
                          >
                            <div className="w-[36px] h-[36px] rounded-md flex-none bg-cream-100 border border-cream-border relative overflow-hidden flex items-center justify-center">
                              {variant.primaryImage ? (
                                <Image
                                  src={variant.primaryImage}
                                  alt={variant.variantName}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-neutral-400 opacity-70" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-neutral-900 group-hover/variant:text-secondary-600 group-hover/variant:underline block leading-snug truncate transition-colors">
                                {variant.variantName}
                              </span>
                              <span className="font-mono text-[11px] text-neutral-400 block truncate">
                                {variant.id ? `ID: ${variant.id.slice(0, 8)}...` : "—"}
                              </span>
                            </div>
                          </Link>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-2.5 min-w-[120px] font-mono text-[11.5px] text-neutral-600 truncate">
                          {variant.sku}
                        </td>

                        {/* Pack Sizes */}
                        <td className="px-4 py-2.5 min-w-[150px] text-xs font-medium text-neutral-700 whitespace-nowrap">
                          {unitPrices.length === 0 ? (
                            <span className="text-neutral-400 italic">No sizes added</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span>{formatMeasurement(variant.measurement)}</span>
                              {extraSizes > 0 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200"
                                  title={unitPrices
                                    .map((p) => `${p.measurement.value} ${p.measurement.unit}`)
                                    .join(", ")}
                                >
                                  +{extraSizes} more
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Dietary Type & Featured */}
                        <td className="px-4 py-2.5 min-w-[140px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderDietaryBadge(variant.vegType)}
                            {variant.isFeatured && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10.5px] font-bold border border-amber-200">
                                Featured
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Price (range across pack sizes, if more than one) */}
                        <td className="px-4 py-2.5 min-w-[120px] text-right whitespace-nowrap tabular-nums">
                          {unitPrices.length === 0 ? (
                            <span className="text-neutral-400 italic text-xs">—</span>
                          ) : (
                            <span className="font-bold text-neutral-900 text-xs sm:text-sm">
                              {minPrice === maxPrice
                                ? `₹${minPrice.toLocaleString("en-IN")}`
                                : `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 min-w-[95px] text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              variant.isActive
                                ? "bg-success-50 text-success-700 border border-success-200"
                                : "bg-cream-200 text-neutral-500 border border-cream-border"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                variant.isActive ? "bg-success-600" : "bg-neutral-400"
                              }`}
                            />
                            {variant.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* FIXED ACTION COLUMN (Sticky right) */}
                        <td
                          className={`sticky right-0 transition-colors px-2 py-2.5 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] z-20 ${
                            isPicked
                              ? "bg-cream-50"
                              : "bg-white group-hover:bg-cream-50"
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              data-action-trigger
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeMenu?.variant.id === variant.id) {
                                  setActiveMenu(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveMenu({ variant, rect });
                                }
                              }}
                              className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                activeMenu?.variant.id === variant.id
                                  ? "bg-secondary-600 text-cream-white border-secondary-600"
                                  : "border-cream-border bg-white hover:bg-secondary-50 text-neutral-700 hover:text-secondary-600"
                              }`}
                              title="More actions"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Variants Table Footer */}
          <div className="px-4 py-2.5 border-t border-cream-border bg-cream-50/50 flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
            <span>
              Showing <strong className="text-neutral-900">{variants.length}</strong> of{" "}
              <strong className="text-neutral-900">{currentTabCount}</strong>{" "}
              {variantFilter === "all" ? "" : `${variantFilter} `}Items
            </span>
          </div>
        </section>

      {/* Floating Portal Action Dropdown Menu (Guaranteed Zero Clipping & Viewport Clamping) */}
      {activeMenu &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const { variant, rect } = activeMenu;
            const menuWidth = 192; // 12rem = 192px
            const menuHeight = 240;

            // Position on the LEFT side of the button icon:
            let left = rect.left - menuWidth - 8;
            if (left < 10) {
              left = 10;
            }

            // Align vertically with the button icon:
            let top = rect.top;
            if (top + menuHeight > window.innerHeight - 12) {
              top = Math.max(12, window.innerHeight - menuHeight - 12);
            }

            return (
              <div
                data-action-portal
                style={{
                  position: "fixed",
                  top: `${top}px`,
                  left: `${left}px`,
                  width: `${menuWidth}px`,
                  zIndex: 9999,
                }}
                className="rounded-xl border border-cream-border bg-white p-1.5 shadow-2xl animate-in zoom-in-95 duration-100 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. View Product Variant */}
                <Link
                  href={`/admin/dashboard/variants/${encodeURIComponent(variant.id)}?productId=${encodeURIComponent(canonicalProductId)}`}
                  onClick={() => setActiveMenu(null)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <Eye className="w-3.5 h-3.5 opacity-70" />
                  <span>View Product Item</span>
                </Link>

                {/* 2. Price Change — same Units & Pricing flow as the Edit Item modal */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setEditingVariant(variant);
                    setEditVariantTab("pricing");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <IndianRupee className="w-3.5 h-3.5 opacity-70" />
                  <span>Price Change</span>
                </button>

                {/* 3. Edit */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setEditingVariant(variant);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <Pencil className="w-3.5 h-3.5 opacity-70" />
                  <span>Edit</span>
                </button>

                {/* Manage Images */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setManagingImagesVariant(variant);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <ImagesIcon className="w-3.5 h-3.5 opacity-70" />
                  <span>Manage Images</span>
                </button>

                <div className="my-1 border-t border-cream-border" />

                {/* Status Toggle: Make Inactive vs Make Active */}
                {variant.isActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      setVariantToDeactivate(variant);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Make Inactive</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      setVariantToActivate(variant);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Make Active</span>
                  </button>
                )}

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    setDeletingVariant(variant);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            );
          })(),
          document.body
        )}

      {/* ========================================================================= */}
      {/* MODALS AND DIALOGS                                                       */}
      {/* ========================================================================= */}

      {/* 1. Bulk Price Edit Modal (Existing & Enhanced) */}
      <ProductPriceEditModal
        open={isPriceEditOpen}
        onClose={() => setIsPriceEditOpen(false)}
        productUuid={canonicalProductId}
        productName={product.name}
        variants={variants}
        onSuccess={() => {
          setIsPriceEditOpen(false);
          refetchVariants();
          refetchProduct();
        }}
      />

      {/* 4. Edit Product Modal */}
      <FormModal
        open={isEditProductOpen}
        onClose={() => setIsEditProductOpen(false)}
        title="Edit Product"
        description={`Update information for ${product.name}`}
        size="lg"
      >
        <ProductForm
          initialData={{
            name: product.name,
            slug: product.slug,
            categoryId: product.categoryId || "",
            brandId: product.brandId || "",
            hsnCodeId: product.hsnCodeId || "",
          }}
          initialImageUrl={primaryProductImage}
          isEditing
          categories={categoryOptions}
          brands={brandOptions}
          hsnCodes={hsnOptions}
          isLoading={updateProductMutation.isPending}
          submitLabel="Save Changes"
          onSubmit={async (formData: ProductFormValues) => {
            try {
              const payload = {
                ...formData,
                hsnCodeId: formData.hsnCodeId || null,
                productImage: formData.productImage || null,
              };
              await updateProductMutation.mutateAsync({
                uuid: canonicalProductId,
                data: payload as any,
              });
              setIsEditProductOpen(false);
            } catch (err: any) {
              console.error("Failed to update product", err);
            }
          }}
        />
      </FormModal>

      {/* 5. Add Variant Modal */}
      <FormModal
        open={isAddVariantOpen}
        onClose={() => {
          setIsAddVariantOpen(false);
          setNewlyCreatedVariant(null);
        }}
        title={newlyCreatedVariant ? "Add Units & Pricing" : "Add Item"}
        description={
          newlyCreatedVariant
            ? `Add at least one unit + price combination for ${newlyCreatedVariant.variantName}`
            : `Create a new Item for ${product.name}`
        }
        size="lg"
      >
        {!newlyCreatedVariant ? (
          <VariantForm
            fixedProductId={canonicalProductId}
            fixedProductSlug={product.slug}
            isLoading={createVariantMutation.isPending}
            submitLabel="Next: Units & Pricing"
            onSubmit={async (formData: VariantFormValues) => {
              try {
                const res = await createVariantMutation.mutateAsync({
                  productUuid: canonicalProductId,
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
                if (res && (res as any).data) {
                  setNewlyCreatedVariant((res as any).data);
                }
              } catch (err: any) {
                console.error("Failed to create Item", err);
              }
            }}
          />
        ) : (
          <div className="space-y-4">


     

            <VariantUnitPriceList
              productUuid={canonicalProductId}
              variantUuid={newlyCreatedVariant.id}
            />
            <div className="flex justify-end gap-2">
              {!hasNewlyCreatedPrices ? (
                <Button
                  type="button"
                  onClick={() => {
                    setIsAddVariantOpen(false);
                    setNewlyCreatedVariant(null);
                  }}
                  className="h-10 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 hover:bg-neutral-200 px-5 text-sm font-semibold cursor-pointer"
                >
                  Skip for now & Close
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateVariantMutation.mutateAsync({
                        productUuid: canonicalProductId,
                        variantUuid: newlyCreatedVariant.id,
                        data: { isActive: true },
                      });
                      toast.success("Item Activated", "Item is now active and ready for customers.");
                    } catch (e) {
                      console.error("Failed to activate variant:", e);
                    }
                    setIsAddVariantOpen(false);
                    setNewlyCreatedVariant(null);
                  }}
                  className="h-10 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] cursor-pointer"
                >
                  Save & Activate
                </Button>
              )}
            </div>
          </div>
        )}
      </FormModal>

      {/* 6. Edit Full Variant Details Modal */}
      <FormModal
        open={!!editingVariant}
        onClose={() => {
          setEditingVariant(null);
          setEditVariantTab("details");
        }}
        title="Edit Item"
        description={`Modify configuration for ${editingVariant?.variantName}`}
        size="lg"
      >
        {editingVariant && (
          <div>
            <div className="flex border-b border-[var(--color-neutral-200)] mb-6">
              <button
                type="button"
                onClick={() => setEditVariantTab("details")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  editVariantTab === "details"
                    ? "border-[var(--color-secondary-600)] text-[var(--color-secondary-600)]"
                    : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)]"
                }`}
              >
                Item Details
              </button>
              <button
                type="button"
                onClick={() => setEditVariantTab("pricing")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  editVariantTab === "pricing"
                    ? "border-[var(--color-secondary-600)] text-[var(--color-secondary-600)]"
                    : "border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)]"
                }`}
              >
                Units & Pricing
              </button>
            </div>

            {editVariantTab === "details" ? (
              <VariantForm
                initialData={{
                  variantName: editingVariant.variantName,
                  slug: editingVariant.slug || "",
                  shortDescription: editingVariant.shortDescription || "",
                  description: editingVariant.description || "",
                  ingredients: editingVariant.ingredients || "",
                  isReadyToMix: editingVariant.isReadyToMix ?? false,
                  cookingRecipe: editingVariant.cookingRecipe || "",
                  shelfLife: editingVariant.shelfLife || "",
                  vegType: editingVariant.vegType || "na",
                  isFeatured: editingVariant.isFeatured ?? false,
                }}
                isEditing
                fixedProductId={canonicalProductId}
                fixedProductSlug={product.slug}
                isLoading={updateVariantMutation.isPending}
                submitLabel="Update Item"
                onSubmit={async (formData: VariantFormValues) => {
                  try {
                    await updateVariantMutation.mutateAsync({
                      productUuid: canonicalProductId,
                      variantUuid: editingVariant.id,
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
                    setEditingVariant(null);
                  } catch (err: any) {
                    console.error("Failed to update Item", err);
                  }
                }}
              />
            ) : (
              <VariantUnitPriceList
                productUuid={canonicalProductId}
                variantUuid={editingVariant.id}
              />
            )}
          </div>
        )}
      </FormModal>

      {/* 7. Make Variant Inactive Confirmation Dialog */}
      <ConfirmDialog
        open={!!variantToDeactivate}
        onClose={() => setVariantToDeactivate(null)}
        onConfirm={async () => {
          if (!variantToDeactivate) return;
          const target = variantToDeactivate;
          setVariantToDeactivate(null);
          await handleMakeInactive(target);
        }}
        title="Make Item Inactive?"
        description="Are you sure you want to make this product Item inactive?"
        confirmText="Make Inactive"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isStatusUpdating}
      />

      {/* 8. Make Variant Active Confirmation Dialog */}
      <ConfirmDialog
        open={!!variantToActivate}
        onClose={() => setVariantToActivate(null)}
        onConfirm={async () => {
          if (!variantToActivate) return;
          const target = variantToActivate;
          setVariantToActivate(null);
          await handleMakeActive(target);
        }}
        title="Make Item Active?"
        description="Are you sure you want to make this product item active?"
        confirmText="Make Active"
        cancelText="Cancel"
        variant="default"
        isLoading={isStatusUpdating}
      />

      {/* 8b. Bulk Status Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(bulkStatusAction)}
        onClose={() => setBulkStatusAction(null)}
        onConfirm={async () => {
          if (!bulkStatusAction) return;
          const { targetActive } = bulkStatusAction;
          setBulkStatusAction(null);
          await handleBulkStatusChange(targetActive);
        }}
        title={
          bulkStatusAction
            ? bulkStatusAction.targetActive
              ? `Activate ${bulkStatusAction.count} Item${bulkStatusAction.count > 1 ? "s" : ""} ?`
              : `Deactivate ${bulkStatusAction.count} Item${bulkStatusAction.count > 1 ? "s" : ""} ?`
            : "Update Item Status?"
        }
        description={
          bulkStatusAction
            ? bulkStatusAction.targetActive
              ? `Are you sure you want to activate ${bulkStatusAction.count} selected item${bulkStatusAction.count > 1 ? "s" : ""}? They will be marked as active and visible to customers.`
              : `Are you sure you want to deactivate ${bulkStatusAction.count} selected item${bulkStatusAction.count > 1 ? "s" : ""}? They will be marked as inactive and hidden from customers.`
            : "Are you sure you want to update the status of selected items?"
        }
        confirmText={
          bulkStatusAction
            ? bulkStatusAction.targetActive
              ? `Activate (${bulkStatusAction.count})`
              : `Deactivate (${bulkStatusAction.count})`
            : "Confirm"
        }
        cancelText="Cancel"
        variant={bulkStatusAction?.targetActive ? "default" : "destructive"}
        isLoading={isStatusUpdating}
      />

      {/* 9. Delete Variant Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingVariant}
        onClose={() => setDeletingVariant(null)}
        onConfirm={async () => {
          if (!deletingVariant) return;
          const target = deletingVariant;
          setDeletingVariant(null);
          try {
            await deleteVariantMutation.mutateAsync({
              productUuid: canonicalProductId,
              variantUuid: target.id,
            });
          } catch (err: any) {
            console.error("Failed to delete item", err);
          }
        }}
        title="Delete Item"
        description={`Are you sure you want to delete the Item "${deletingVariant?.variantName}" (${deletingVariant?.sku})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteVariantMutation.isPending}
      />

      {/* 10. Manage Variant Images Modal */}
      <FormModal
        open={Boolean(managingImagesVariant)}
        onClose={() => setManagingImagesVariant(null)}
        title={`Manage Images: ${managingImagesVariant?.variantName || ""}`}
        description="Upload and crop product item images (500 × 500 px)"
        size="lg"
      >
        {managingImagesVariant && (
          <VariantImageUploader
            productUuid={canonicalProductId}
            variantUuid={managingImagesVariant.id}
            variantName={managingImagesVariant.variantName}
            onFinish={() => {
              setManagingImagesVariant(null);
            }}
          />
        )}
      </FormModal>

      {/* 11. Customer View Live Card Preview Modal */}
      <VariantCustomerPreviewModal
        variant={previewVariant}
        isOpen={Boolean(previewVariant)}
        onClose={() => setPreviewVariant(null)}
      />
    </div>
  );
}
