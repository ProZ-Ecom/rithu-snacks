"use client";

import { use, useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ChevronRight, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import {
  useCustomerGlobalVariants,
  useCustomerCategories,
} from "@/features/customers/hooks/use-customer-catalog";
import { CustomerProductGrid } from "@/features/customers/components/catalog/CustomerProductGrid";
import { FilterSidebar } from "@/components/storefront/filters/FilterSidebar";
import type { CustomerGlobalVariantListInput } from "@/features/customers/validations/catalog.schema";
import type { CustomerVariantListItemDto } from "@/features/customers/types/catalog.types";

interface CategoryProductsPageProps {
  params: Promise<{ slug: string }>;
}

const SORT_OPTIONS: {
  value: string;
  label: string;
  sortBy: CustomerGlobalVariantListInput["sortBy"];
  sortOrder: CustomerGlobalVariantListInput["sortOrder"];
}[] = [
  { value: "createdAt_desc", label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { value: "price_asc", label: "Price: Low to High", sortBy: "basePrice", sortOrder: "asc" },
  { value: "price_desc", label: "Price: High to Low", sortBy: "basePrice", sortOrder: "desc" },
  { value: "name_asc", label: "Name: A to Z", sortBy: "variantName", sortOrder: "asc" },
  { value: "name_desc", label: "Name: Z to A", sortBy: "variantName", sortOrder: "desc" },
];

function ProductCatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-5 sm:gap-6 animate-in fade-in duration-200">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
        <div
          key={n}
          className="bg-white rounded-2xl border border-[#E8D9CD]/80 p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs space-y-3"
        >
          {/* Image skeleton with shimmer */}
          <div className="relative aspect-square w-full rounded-xl skeleton-shimmer overflow-hidden bg-stone-100" />

          {/* Info row: Category, title & pack size pills */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-20 rounded skeleton-shimmer bg-stone-100" />
              <div className="flex gap-1">
                <div className="h-4.5 w-10 rounded skeleton-shimmer bg-stone-100" />
                <div className="h-4.5 w-10 rounded skeleton-shimmer bg-stone-100" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="h-4.5 w-36 rounded skeleton-shimmer bg-stone-100" />
              <div className="h-4.5 w-14 rounded skeleton-shimmer bg-stone-100" />
            </div>
          </div>

          {/* Golden CTA button skeleton */}
          <div className="h-10 w-full rounded-xl skeleton-shimmer bg-[#F8BE15]/20" />
        </div>
      ))}
    </div>
  );
}

function CategoryProductsContent({
  params,
}: CategoryProductsPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProductId = searchParams.get("productId") || searchParams.get("product");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("createdAt_desc");
  const [activeCategoryOverride, setActiveCategoryOverride] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    urlProductId ? [urlProductId] : []
  );
  const [stockStatus, setStockStatus] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [vegType, setVegType] = useState<"all" | "veg" | "non_veg" | "vegan">("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync URL product filter
  useEffect(() => {
    if (urlProductId) {
      setSelectedProductIds([urlProductId]);
      setPage(1);
    } else {
      setSelectedProductIds([]);
    }
  }, [urlProductId]);

  // Accumulated variants for Infinite Scroll
  const [accumulatedVariants, setAccumulatedVariants] = useState<CustomerVariantListItemDto[]>([]);

  // Fetch all categories (pageSize 250 supported)
  const { data: categoriesData, isLoading: isLoadingCategories } = useCustomerCategories({ pageSize: 250 });
  const categories = categoriesData?.data ?? [];

  // Isolate to single category mode if slug is not "all"
  const isSingleCategoryMode = slug !== "all";

  // Reset internal state when the route slug changes
  useEffect(() => {
    setActiveCategoryOverride(null);
    setSelectedProductIds(urlProductId ? [urlProductId] : []);
    setPage(1);
  }, [slug, urlProductId]);

  // Resolve current active category (from URL slug or in-page selection)
  const activeSlug = activeCategoryOverride ?? slug;

  const currentCategory = useMemo(() => {
    return categories.find(
      (c) =>
        c.id === activeSlug ||
        c.name.toLowerCase() === activeSlug.toLowerCase() ||
        c.name.toLowerCase().replace(/\s+/g, "-") === activeSlug.toLowerCase() ||
        c.name.toLowerCase().replace(/\s+/g, "_") === activeSlug.toLowerCase()
    );
  }, [categories, activeSlug]);

  const activeCategoryId = useMemo(() => {
    if (activeSlug === "all") return null;
    if (currentCategory) return currentCategory.id;
    if (activeSlug && activeSlug !== "all") return activeSlug;
    return null;
  }, [currentCategory, activeSlug]);

  const categoryTitle = useMemo(() => {
    if (currentCategory?.name) return currentCategory.name;
    if (activeSlug === "all" || !activeCategoryId) return "All Snacks";
    if (activeSlug.includes("-") && activeSlug.length > 30) return "Category Snacks";
    return activeSlug.charAt(0).toUpperCase() + activeSlug.slice(1);
  }, [currentCategory, activeSlug, activeCategoryId]);

  // When in single category mode, FilterSidebar only displays this single selected category
  const categoriesForSidebar = useMemo(() => {
    if (!isSingleCategoryMode) return categories;
    if (currentCategory) return [currentCategory];
    if (activeCategoryId) {
      return [
        {
          id: activeCategoryId,
          name: categoryTitle,
          slug: activeSlug,
          description: null,
          image: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [isSingleCategoryMode, categories, currentCategory, activeCategoryId, categoryTitle, activeSlug]);

  // Find active sort config
  const activeSort = useMemo(() => {
    return SORT_OPTIONS.find((s) => s.value === sortKey) ?? SORT_OPTIONS[0];
  }, [sortKey]);

  const inStockParam =
    stockStatus === "in_stock" ? true : stockStatus === "out_of_stock" ? false : undefined;
  const vegTypeParam =
    vegType === "veg"
      ? ("veg" as const)
      : vegType === "non_veg"
      ? ("non_veg" as const)
      : vegType === "vegan"
      ? ("vegan" as const)
      : undefined;

  // Query variants with database-level filters (POST /api/customer/variants)
  const {
    data: variantsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCustomerGlobalVariants({
    page,
    pageSize: 18,
    search: search.trim() ? search.trim() : undefined,
    categoryIds: activeCategoryId ? [activeCategoryId] : undefined,
    productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
    minPrice: minPrice > 0 ? minPrice : undefined,
    maxPrice: maxPrice < 1000 ? maxPrice : undefined,
    inStock: inStockParam,
    vegType: vegTypeParam,
    sortBy: activeSort.sortBy,
    sortOrder: activeSort.sortOrder,
  });

  const meta = variantsResponse?.meta;

  // Infinite Scroll accumulation logic
  useEffect(() => {
    if (!variantsResponse?.data) return;

    if (page === 1) {
      setAccumulatedVariants(variantsResponse.data);
    } else {
      setAccumulatedVariants((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = variantsResponse.data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    }
  }, [variantsResponse?.data, page]);

  // Derive displayed variants: on page 1 always prioritize variantsResponse.data directly,
  // falling back to accumulatedVariants (for infinite scroll pages 2+).
  const displayedVariants = useMemo(() => {
    if (page === 1 && variantsResponse?.data) {
      return variantsResponse.data;
    }
    return accumulatedVariants;
  }, [page, variantsResponse?.data, accumulatedVariants]);

  // Catalog container ref for smooth viewport scroll on filter change
  const catalogContentRef = useRef<HTMLDivElement>(null);

  const scrollToCatalogTop = () => {
    if (typeof window === "undefined" || !catalogContentRef.current) return;
    const rect = catalogContentRef.current.getBoundingClientRect();
    if (rect.top < 80) {
      const targetY = window.scrollY + rect.top - 90;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }
  };

  // Infinite Scroll IntersectionObserver sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          meta &&
          page < meta.totalPages &&
          !isFetching &&
          !isLoading &&
          displayedVariants.length < (meta.total ?? 0)
        ) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const currentSentinel = sentinelRef.current;
    observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
      observer.disconnect();
    };
  }, [meta, page, isFetching, isLoading, displayedVariants.length]);

  // Category Selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedProductIds([]);
    scrollToCatalogTop();
    if (!categoryId) {
      setActiveCategoryOverride("all");
      setPage(1);
      window.history.pushState(null, "", "/categories/all");
      return;
    }
    setActiveCategoryOverride(categoryId);
    setPage(1);
    window.history.pushState(null, "", `/categories/${categoryId}`);
  };

  // Product Selection under Category (Multi-select)
  const handleProductSelect = (productIds: string[]) => {
    setSelectedProductIds(productIds);
    setPage(1);
    scrollToCatalogTop();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (productIds.length === 1) {
        params.set("productId", productIds[0]);
      } else {
        params.delete("productId");
        params.delete("product");
      }
      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    selectedProductIds.length > 0 ||
    stockStatus !== "all" ||
    vegType !== "all" ||
    minPrice > 0 ||
    maxPrice < 1000 ||
    sortKey !== "createdAt_desc" ||
    (!isSingleCategoryMode && Boolean(activeCategoryId));

  // Reset Filters - safely clears all filters
  const handleResetFilters = () => {
    if (!hasActiveFilters) return;
    setSearch("");
    setSortKey("createdAt_desc");
    setStockStatus("all");
    setVegType("all");
    setMinPrice(0);
    setMaxPrice(1000);
    setSelectedProductIds([]);
    if (!isSingleCategoryMode) {
      setActiveCategoryOverride(null);
    }
    setPage(1);
    scrollToCatalogTop();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("productId");
      params.delete("product");
      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const activeFilterCount = [
    Boolean(search.trim()),
    selectedProductIds.length > 0,
    stockStatus !== "all",
    vegType !== "all",
    minPrice > 0 || maxPrice < 1000,
    sortKey !== "createdAt_desc",
    !isSingleCategoryMode && Boolean(activeCategoryId),
  ].filter(Boolean).length;

  const hasMorePages = meta ? page < meta.totalPages : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero / Header Banner with Warm Background */}
      <div className="border-b border-[var(--theme-border)] bg-gradient-to-b from-[#FFFDF9] via-[#FAF4ED] to-[#F5ECE1] py-8 sm:py-12">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb navigation */}
          <nav className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#7A6258] mb-3">
            <Link href="/" className="hover:text-[#7A2224] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            {isSingleCategoryMode ? (
              <span className="font-bold text-[#2D1810]">{categoryTitle}</span>
            ) : (
              <span className="font-bold text-[#2D1810]">All Categories</span>
            )}
          </nav>

          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#7A2224]/10 text-[#7A2224] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#F8BE15]" />
              Authentic Collection
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#2D1810] font-serif tracking-tight">
              {categoryTitle}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#7A6258] max-w-2xl mx-auto leading-relaxed">
              Handcrafted authentic snacks and delicacies made with traditional recipes, pure ingredients, and rich heritage.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full bg-white">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 bg-white">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden mb-6 flex items-center justify-between gap-3 bg-white border border-[#E8D9CD] rounded-xl p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7A2224] text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-[#F8BE15] text-[#2D1810] font-black text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="text-xs text-[#7A6258] font-medium">
            Showing <strong className="text-[#2D1810]">{meta?.total ?? displayedVariants.length}</strong> snacks
          </span>
        </div>

        {/* 2-Column Layout: Left FilterSidebar, Right Products Grid */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Left Sticky FilterSidebar */}
          <FilterSidebar
            categories={categoriesForSidebar}
            isLoadingCategories={isLoadingCategories && categories.length === 0}
            selectedCategoryId={activeCategoryId}
            onSelectCategory={handleCategorySelect}
            selectedProductIds={selectedProductIds}
            onSelectProducts={handleProductSelect}
            isSingleCategoryMode={isSingleCategoryMode}
            viewAllCategoriesHref="/categories/all"
            searchQuery={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
              scrollToCatalogTop();
            }}
            sortKey={sortKey}
            onSortChange={(val) => {
              setSortKey(val);
              setPage(1);
              scrollToCatalogTop();
            }}
            stockStatus={stockStatus}
            onStockStatusChange={(val) => {
              setStockStatus(val);
              setPage(1);
              scrollToCatalogTop();
            }}
            vegType={vegType}
            onVegTypeChange={(val) => {
              setVegType(val);
              setPage(1);
              scrollToCatalogTop();
            }}
            minPriceLimit={0}
            maxPriceLimit={1000}
            currentMinPrice={minPrice}
            currentMaxPrice={maxPrice}
            onPriceChange={(min, max) => {
              setMinPrice(min);
              setMaxPrice(max);
              setPage(1);
              scrollToCatalogTop();
            }}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            isMobileOpen={isMobileFilterOpen}
            onCloseMobile={() => setIsMobileFilterOpen(false)}
            totalResultsCount={meta?.total}
            facets={meta?.facets}
          />

          {/* Right Main Products Display (3 cards per row) */}
          <div ref={catalogContentRef} className="flex-1 min-w-0 w-full min-h-[750px] lg:min-h-[850px]">
            {/* Header info bar */}
            <div className="hidden lg:flex items-center justify-between mb-6 pb-3 border-b border-[#E8D9CD]">
              <p className="text-sm text-[#7A6258]">
                Showing{" "}
                <strong className="text-[#2D1810]">
                  {meta?.total ?? displayedVariants.length}
                </strong>{" "}
                authentic {meta?.total === 1 ? "snack" : "snacks"} in{" "}
                <strong className="text-[#7A2224] font-bold">
                  {categoryTitle}
                </strong>
                {selectedProductIds.length > 0 && (
                  <span className="ml-2 text-xs bg-[#F5ECE1] text-[#7A2224] px-2 py-0.5 rounded-full font-semibold">
                    {selectedProductIds.length === 1
                      ? "1 Product filtered"
                      : `${selectedProductIds.length} Products filtered`}
                  </span>
                )}
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#7A2224] hover:underline cursor-pointer transition-colors"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="rounded-2xl border border-[#E8D9CD] bg-[#FFFDF9] p-8 text-center max-w-md mx-auto my-8 shadow-xs">
                <h3 className="text-base font-bold text-[#2D1810] mb-2">
                  Unable to load snacks
                </h3>
                <p className="text-xs text-[#7A6258] mb-4">
                  We encountered a connection issue fetching the snacks for this category.
                </p>
                <Button
                  onClick={() => refetch()}
                  className="h-9 px-5 rounded-xl bg-[#7A2224] hover:bg-[#5A1911] text-white text-xs font-bold cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Content Area: Skeleton only while initial load or empty and fetching */}
            {(isLoading && displayedVariants.length === 0) ? (
              <ProductCatalogSkeleton />
            ) : (
              <div className={isFetching && page === 1 ? "opacity-60 transition-opacity duration-200" : "transition-opacity duration-200"}>
                <CustomerProductGrid
                  variants={displayedVariants}
                  columns={3}
                  onResetFilters={hasActiveFilters ? handleResetFilters : undefined}
                />

                {/* Shimmer cards appended at the bottom while next infinite scroll page loads */}
                {isFetching && page > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-5 sm:gap-6 mt-6 animate-in fade-in duration-200">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={`append-skel-${n}`}
                        className="bg-white rounded-2xl border border-[#E8D9CD]/80 p-3.5 flex flex-col justify-between overflow-hidden shadow-2xs space-y-3"
                      >
                        <div className="relative aspect-square w-full rounded-xl skeleton-shimmer overflow-hidden bg-stone-100" />
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="h-3 w-20 rounded skeleton-shimmer bg-stone-100" />
                            <div className="h-4.5 w-10 rounded skeleton-shimmer bg-stone-100" />
                          </div>
                          <div className="h-4.5 w-36 rounded skeleton-shimmer bg-stone-100" />
                        </div>
                        <div className="h-10 w-full rounded-xl skeleton-shimmer bg-[#F8BE15]/20" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Infinite Scroll Sentinel & Loading Indicator */}
                <div
                  ref={sentinelRef}
                  className="h-16 flex items-center justify-center my-6"
                >
                  {isFetching && page > 1 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8D9CD] shadow-xs text-xs font-bold text-[#7A2224] animate-in fade-in">
                      <Loader2 className="w-4 h-4 animate-spin text-[#7A2224]" />
                      Loading more snacks...
                    </div>
                  )}

                  {!hasMorePages && displayedVariants.length > 0 && !isFetching && (
                    <p className="text-xs font-semibold text-[#9C8274] select-none">
                      ✦ You have viewed all {displayedVariants.length} snacks ✦
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function CategoryProductsClient(props: CategoryProductsPageProps) {
  return (
    <Suspense fallback={<ProductCatalogSkeleton />}>
      <CategoryProductsContent {...props} />
    </Suspense>
  );
}

