"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  X,
  SlidersHorizontal,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { customerCatalogApi } from "@/features/customers/api/customer-catalog.api";
import { Select, type SelectOption } from "@/components/ui/select";

export interface CategoryOption {
  id: string;
  name: string;
}

export interface FilterSidebarProps {
  // Categories (handles 200+ categories)
  categories: CategoryOption[];
  isLoadingCategories?: boolean;
  selectedCategoryId?: string | null;
  selectedCategoryIds?: string[];
  onSelectCategory?: (categoryId: string | null) => void;
  onSelectCategories?: (categoryIds: string[]) => void;

  // Single category isolation mode (e.g. /categories/[id])
  isSingleCategoryMode?: boolean;
  viewAllCategoriesHref?: string;

  // Selected Products inside categories
  selectedProductId?: string | null;
  selectedProductIds?: string[];
  onSelectProduct?: (productId: string | null) => void;
  onSelectProducts?: (productIds: string[]) => void;

  // Search by name
  searchQuery: string;
  onSearchChange: (search: string) => void;

  // Sort By
  sortKey: string;
  onSortChange: (sortKey: string) => void;

  // Curated / Featured Items
  isFeaturedOnly?: boolean;
  onFeaturedOnlyChange?: (featured: boolean) => void;

  // Availability / In Stock
  stockStatus: "all" | "in_stock" | "out_of_stock";
  onStockStatusChange: (status: "all" | "in_stock" | "out_of_stock") => void;

  // Dietary (Veg / Non-Veg / Vegan)
  vegType: "all" | "veg" | "non_veg" | "vegan";
  onVegTypeChange: (vegType: "all" | "veg" | "non_veg" | "vegan") => void;

  // Facet availability counts
  facets?: {
    inStockCount?: number;
    outOfStockCount?: number;
    vegCount?: number;
    nonVegCount?: number;
    veganCount?: number;
    featuredCount?: number;
  };

  // Price Range Slider
  minPriceLimit?: number;
  maxPriceLimit?: number;
  currentMinPrice: number;
  currentMaxPrice: number;
  onPriceChange: (min: number, max: number) => void;

  // Clear & Active States
  onResetFilters: () => void;
  hasActiveFilters: boolean;

  // Optional styling & mobile drawer state
  className?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  totalResultsCount?: number;
}

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
];

export function FilterSidebar({
  categories,
  isLoadingCategories = false,
  selectedCategoryId,
  selectedCategoryIds,
  onSelectCategory,
  onSelectCategories,
  isSingleCategoryMode = false,
  viewAllCategoriesHref = "/categories/all",
  selectedProductId = null,
  selectedProductIds,
  onSelectProduct,
  onSelectProducts,
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  isFeaturedOnly = false,
  onFeaturedOnlyChange,
  stockStatus,
  onStockStatusChange,
  vegType,
  onVegTypeChange,
  facets,
  minPriceLimit = 0,
  maxPriceLimit = 1000,
  currentMinPrice,
  currentMaxPrice,
  onPriceChange,
  onResetFilters,
  hasActiveFilters,
  className = "",
  isMobileOpen = false,
  onCloseMobile,
  totalResultsCount,
}: FilterSidebarProps) {
  // Category accordion & inline search for 200+ categories
  const [isCategoriesOpen, setIsCategoriesOpen] = React.useState(true);
  const [categorySearch, setCategorySearch] = React.useState("");

  // Normalized active categories & products for multiple selection
  const activeCategoryIds = React.useMemo<string[]>(() => {
    if (selectedCategoryIds !== undefined) return selectedCategoryIds;
    return selectedCategoryId ? [selectedCategoryId] : [];
  }, [selectedCategoryIds, selectedCategoryId]);

  const activeProductIds = React.useMemo<string[]>(() => {
    if (selectedProductIds !== undefined) return selectedProductIds;
    return selectedProductId ? [selectedProductId] : [];
  }, [selectedProductIds, selectedProductId]);

  // Nested Tree: Expanded category IDs & cached products per category
  const [expandedCategoryIds, setExpandedCategoryIds] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (selectedCategoryId) initial.add(selectedCategoryId);
    if (selectedCategoryIds) selectedCategoryIds.forEach((id) => initial.add(id));
    if (isSingleCategoryMode && categories[0]?.id) initial.add(categories[0].id);
    return initial;
  });

  const [categoryProducts, setCategoryProducts] = React.useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [loadingCategoryIds, setLoadingCategoryIds] = React.useState<Set<string>>(new Set());

  // Ref to prevent duplicate or runaway in-flight fetches for the same category
  const fetchingRef = React.useRef<Set<string>>(new Set());
  const isMountedRef = React.useRef(false);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if specific filter options are not available in current catalog/category
  const isInStockDisabled = facets ? (facets.inStockCount ?? 0) === 0 : false;
  const isOutOfStockDisabled = facets ? (facets.outOfStockCount ?? 0) === 0 : false;
  const isVegDisabled = facets ? (facets.vegCount ?? 0) === 0 : false;
  const isNonVegDisabled = facets ? (facets.nonVegCount ?? 0) === 0 : false;
  const isVeganDisabled = facets ? (facets.veganCount ?? 0) === 0 : false;

  // Auto-reset if active filter becomes unavailable
  React.useEffect(() => {
    if (isOutOfStockDisabled && stockStatus === "out_of_stock") {
      onStockStatusChange("all");
    }
  }, [isOutOfStockDisabled, stockStatus, onStockStatusChange]);

  React.useEffect(() => {
    if (isInStockDisabled && stockStatus === "in_stock") {
      onStockStatusChange("all");
    }
  }, [isInStockDisabled, stockStatus, onStockStatusChange]);

  React.useEffect(() => {
    if (isNonVegDisabled && vegType === "non_veg") {
      onVegTypeChange("all");
    }
  }, [isNonVegDisabled, vegType, onVegTypeChange]);

  React.useEffect(() => {
    if (isVegDisabled && vegType === "veg") {
      onVegTypeChange("all");
    }
  }, [isVegDisabled, vegType, onVegTypeChange]);

  React.useEffect(() => {
    if (isVeganDisabled && vegType === "vegan") {
      onVegTypeChange("all");
    }
  }, [isVeganDisabled, vegType, onVegTypeChange]);

  // Auto-expand and load products for selected categories
  React.useEffect(() => {
    const targetCatIds = isSingleCategoryMode
      ? [categories[0]?.id].filter(Boolean) as string[]
      : activeCategoryIds;

    for (const targetCatId of targetCatIds) {
      setExpandedCategoryIds((prev) => {
        if (prev.has(targetCatId)) return prev;
        const next = new Set(prev);
        next.add(targetCatId);
        return next;
      });

      if (
        !categoryProducts[targetCatId] &&
        !fetchingRef.current.has(targetCatId)
      ) {
        fetchingRef.current.add(targetCatId);
        setLoadingCategoryIds((prev) => new Set(prev).add(targetCatId));

        customerCatalogApi
          .getProducts({
            categoryIds: [targetCatId],
            pageSize: 50,
          })
          .then((res) => {
            if (!isMountedRef.current) return;
            const prods = (res.data || []).map((p) => ({ id: p.id, name: p.name }));
            setCategoryProducts((prev) => ({ ...prev, [targetCatId]: prods }));
          })
          .catch((err) => {
            console.error("Failed to load products for category", targetCatId, err);
          })
          .finally(() => {
            fetchingRef.current.delete(targetCatId);
            if (isMountedRef.current) {
              setLoadingCategoryIds((prev) => {
                const next = new Set(prev);
                next.delete(targetCatId);
                return next;
              });
            }
          });
      }
    }
  }, [activeCategoryIds, isSingleCategoryMode, categories, categoryProducts]);

  // Fetch products for a category when user clicks expand chevron
  const toggleCategoryExpand = React.useCallback(
    async (categoryId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();

      const willBeExpanded = !expandedCategoryIds.has(categoryId);
      setExpandedCategoryIds((prev) => {
        const next = new Set(prev);
        if (willBeExpanded) {
          next.add(categoryId);
        } else {
          next.delete(categoryId);
        }
        return next;
      });

      // If expanding and products not yet loaded or fetching, fetch them once
      if (
        willBeExpanded &&
        !categoryProducts[categoryId] &&
        !fetchingRef.current.has(categoryId)
      ) {
        fetchingRef.current.add(categoryId);
        setLoadingCategoryIds((prev) => new Set(prev).add(categoryId));
        try {
          const res = await customerCatalogApi.getProducts({
            categoryIds: [categoryId],
            pageSize: 50,
          });
          if (!isMountedRef.current) return;
          const prods = (res.data || []).map((p) => ({ id: p.id, name: p.name }));
          setCategoryProducts((prev) => ({ ...prev, [categoryId]: prods }));
        } catch (err) {
          console.error("Failed to load products for category", categoryId, err);
        } finally {
          fetchingRef.current.delete(categoryId);
          if (isMountedRef.current) {
            setLoadingCategoryIds((prev) => {
              const next = new Set(prev);
              next.delete(categoryId);
              return next;
            });
          }
        }
      }
    },
    [expandedCategoryIds, categoryProducts]
  );

  // Helper to check if a category is selected (either explicitly in activeCategoryIds or via any of its products)
  const isCategoryActive = React.useCallback(
    (catId: string) => {
      if (isSingleCategoryMode) return true;
      if (activeCategoryIds.includes(catId)) return true;
      const prods = categoryProducts[catId] || [];
      return prods.some((p) => activeProductIds.includes(p.id));
    },
    [isSingleCategoryMode, activeCategoryIds, categoryProducts, activeProductIds]
  );

  // Multi-select handlers
  const handleCategoryToggle = React.useCallback(
    (catId: string) => {
      const catProds = categoryProducts[catId] || [];
      const isCurrentlyActive = isCategoryActive(catId);

      if (isCurrentlyActive) {
        // UNCHECKING category:
        // 1. Remove catId from category list
        const nextCatIds = activeCategoryIds.filter((id) => id !== catId);

        // 2. Remove all products belonging to this category from product list
        const catProdIds = new Set(catProds.map((p) => p.id));
        let nextProdIds = activeProductIds.filter((id) => !catProdIds.has(id));

        // If no categories remain selected, clear all products so All Snacks is fully active
        if (nextCatIds.length === 0) {
          nextProdIds = [];
        }

        if (onSelectCategories) {
          onSelectCategories(nextCatIds);
        } else if (onSelectCategory) {
          onSelectCategory(nextCatIds.length > 0 ? nextCatIds[0] : null);
        }

        if (onSelectProducts) {
          onSelectProducts(nextProdIds);
        } else if (onSelectProduct) {
          onSelectProduct(nextProdIds.length > 0 ? nextProdIds[0] : null);
        }
      } else {
        // CHECKING category (show all products of that category):
        // 1. Add catId to category list
        const nextCatIds = onSelectCategories
          ? [...activeCategoryIds.filter((id) => id !== catId), catId]
          : [catId];

        // 2. Clear any specific product filters under this category so ALL products of this category are displayed
        const catProdIds = new Set(catProds.map((p) => p.id));
        const nextProdIds = activeProductIds.filter((id) => !catProdIds.has(id));

        if (onSelectCategories) {
          onSelectCategories(nextCatIds);
        } else if (onSelectCategory) {
          onSelectCategory(catId);
        }

        if (onSelectProducts) {
          onSelectProducts(nextProdIds);
        } else if (onSelectProduct) {
          onSelectProduct(nextProdIds.length > 0 ? nextProdIds[0] : null);
        }

        // Auto-expand category so user sees its products
        if (!expandedCategoryIds.has(catId)) {
          toggleCategoryExpand(catId);
        }
      }
    },
    [
      isCategoryActive,
      activeCategoryIds,
      activeProductIds,
      categoryProducts,
      onSelectCategories,
      onSelectCategory,
      onSelectProducts,
      onSelectProduct,
      expandedCategoryIds,
      toggleCategoryExpand,
    ]
  );

  const handleProductToggle = React.useCallback(
    (prodId: string, catId?: string) => {
      const isCurrentlyActive = activeProductIds.includes(prodId);

      if (isCurrentlyActive) {
        // UNCHECKING product:
        const nextProdIds = activeProductIds.filter((id) => id !== prodId);

        if (onSelectProducts) {
          onSelectProducts(nextProdIds);
        } else if (onSelectProduct) {
          onSelectProduct(nextProdIds.length > 0 ? nextProdIds[0] : null);
        }
      } else {
        // CHECKING product: ensure parent category checkbox is selected!
        const nextProdIds = [...activeProductIds, prodId];

        if (onSelectProducts) {
          onSelectProducts(nextProdIds);
        } else if (onSelectProduct) {
          onSelectProduct(prodId);
        }

        if (catId && !isSingleCategoryMode) {
          if (!activeCategoryIds.includes(catId)) {
            const nextCatIds = [...activeCategoryIds, catId];
            if (onSelectCategories) {
              onSelectCategories(nextCatIds);
            } else if (onSelectCategory) {
              onSelectCategory(catId);
            }
          }
        }
      }
    },
    [
      activeProductIds,
      activeCategoryIds,
      isSingleCategoryMode,
      onSelectProducts,
      onSelectProduct,
      onSelectCategories,
      onSelectCategory,
    ]
  );

  const handleAllSnacksClick = React.useCallback(() => {
    if (onSelectCategories) onSelectCategories([]);
    if (onSelectCategory) onSelectCategory(null);
    if (onSelectProducts) onSelectProducts([]);
    if (onSelectProduct) onSelectProduct(null);
  }, [onSelectCategories, onSelectCategory, onSelectProducts, onSelectProduct]);

  const handleAllInCategoryClick = React.useCallback(
    (catId: string) => {
      // Clear product selections
      if (onSelectProducts) onSelectProducts([]);
      if (onSelectProduct) onSelectProduct(null);

      // If category is not selected, select it
      if (!activeCategoryIds.includes(catId)) {
        if (onSelectCategories) {
          onSelectCategories([catId]);
        } else if (onSelectCategory) {
          onSelectCategory(catId);
        }
      }
    },
    [activeCategoryIds, onSelectProducts, onSelectProduct, onSelectCategories, onSelectCategory]
  );

  // Local state for instant slider responsiveness, debounced to parent
  const [localMinPrice, setLocalMinPrice] = React.useState(currentMinPrice);
  const [localMaxPrice, setLocalMaxPrice] = React.useState(currentMaxPrice);
  const onPriceChangeRef = React.useRef(onPriceChange);
  onPriceChangeRef.current = onPriceChange;

  const onSearchChangeRef = React.useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  React.useEffect(() => {
    setLocalMinPrice(currentMinPrice);
    setLocalMaxPrice(currentMaxPrice);
  }, [currentMinPrice, currentMaxPrice]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localMinPrice !== currentMinPrice || localMaxPrice !== currentMaxPrice) {
        onPriceChangeRef.current(localMinPrice, localMaxPrice);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localMinPrice, localMaxPrice, currentMinPrice, currentMaxPrice]);

  // Memoized category search for fast rendering of 200+ categories
  const filteredCategories = React.useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  // Local search text with instant UI feedback
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChangeRef.current(localSearch);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery]);

  // Price slider math
  const priceMinPercent = Math.min(
    100,
    Math.max(0, ((localMinPrice - minPriceLimit) / (maxPriceLimit - minPriceLimit)) * 100)
  );
  const priceMaxPercent = Math.min(
    100,
    Math.max(0, ((localMaxPrice - minPriceLimit) / (maxPriceLimit - minPriceLimit)) * 100)
  );

  // Handle internal reset to immediately clear local search, category search, and price slider
  const handleInternalReset = React.useCallback(() => {
    if (!hasActiveFilters) return;
    setLocalSearch("");
    setCategorySearch("");
    setLocalMinPrice(minPriceLimit);
    setLocalMaxPrice(maxPriceLimit);
    onResetFilters();
  }, [hasActiveFilters, minPriceLimit, maxPriceLimit, onResetFilters]);

  const sidebarContent = (
    <div className="flex flex-col gap-5 text-[#2D1810]">
      {/* 1. Header: Title & Clear Filter Button */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#F0E4D8]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#7A2224]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[#2D1810]">
            Filter Snacks
          </h2>
          {totalResultsCount !== undefined && (
            <span className="text-[11px] bg-[#F5ECE1] text-[#7A2224] px-2 py-0.5 rounded-full font-bold">
              {totalResultsCount}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={handleInternalReset}
          className={`text-xs font-bold flex items-center gap-1.5 transition-colors select-none ${
            hasActiveFilters
              ? "text-[#7A2224] hover:text-[#5A1911] hover:underline cursor-pointer"
              : "opacity-35 cursor-not-allowed pointer-events-none text-[#9C8274]"
          }`}
          title={hasActiveFilters ? "Clear all filters" : "No active filters"}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear Filter
        </button>
      </div>

      {/* 2. Search Snack by Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-search-input"
          className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]"
        >
          Search Snack by Name
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C8274] pointer-events-none" />
          <input
            id="filter-search-input"
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search snacks by name..."
            className="w-full bg-[#FAF6F0] border border-[#DCC7B7] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#2D1810] placeholder-[#A0887A] focus:outline-none focus:border-[#7A2224] focus:ring-1 focus:ring-[#7A2224] transition-all"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                onSearchChange("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8274] hover:text-[#2D1810] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Sort By Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-sort-select"
          className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]"
        >
          Sort By
        </label>
        <Select
          id="filter-sort-select"
          value={sortKey}
          onValueChange={(val) => onSortChange(val)}
          options={SORT_OPTIONS}
          size="md"
          className="bg-[#FAF6F0] border-[#DCC7B7] rounded-xl text-sm font-medium text-[#2D1810]"
        />
      </div>

      {/* 4. Curated / Featured Items Toggle */}
      {onFeaturedOnlyChange && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]">
            Curated Picks
          </span>
          <button
            type="button"
            onClick={() => onFeaturedOnlyChange(!isFeaturedOnly)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all select-none flex items-center justify-between border cursor-pointer ${
              isFeaturedOnly
                ? "bg-[var(--primary-100)] border-[var(--primary-500)] text-[var(--secondary-shade-800)] shadow-xs"
                : "bg-white border-[#DCC7B7] text-[#2D1810] hover:bg-[#FAF6F0]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-4 h-4 ${
                  isFeaturedOnly ? "text-[var(--primary-600)] fill-[var(--primary-500)]" : "text-[var(--primary-600)]"
                }`}
              />
              <span className="font-bold">Featured Snacks</span>
            </div>
            {facets?.featuredCount !== undefined && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isFeaturedOnly
                    ? "bg-[var(--primary-500)] text-[var(--secondary-shade-800)]"
                    : "bg-[#F5ECE1] text-[#7A6258]"
                }`}
              >
                {facets.featuredCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 5. Availability Pills */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]">
          Availability
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isInStockDisabled}
            onClick={() => {
              if (isInStockDisabled) return;
              onStockStatusChange(stockStatus === "in_stock" ? "all" : "in_stock");
            }}
            title={isInStockDisabled ? "No in-stock snacks available" : undefined}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all select-none flex items-center gap-1.5 ${
              isInStockDisabled
                ? "opacity-35 cursor-not-allowed bg-[#FAF6F0] text-[#9C8274] border border-[#DCC7B7]/50"
                : stockStatus === "in_stock"
                ? "bg-[#166534] text-white border border-[#166534] shadow-xs cursor-pointer"
                : "bg-white text-[#4A3228] border border-[#DCC7B7] hover:bg-[#FAF6F0] cursor-pointer"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isInStockDisabled ? "bg-[#9C8274]/50" : "bg-green-500"
              }`}
            />
            In Stock
          </button>

          <button
            type="button"
            disabled={isOutOfStockDisabled}
            onClick={() => {
              if (isOutOfStockDisabled) return;
              onStockStatusChange(stockStatus === "out_of_stock" ? "all" : "out_of_stock");
            }}
            title={isOutOfStockDisabled ? "No out-of-stock snacks available" : undefined}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all select-none flex items-center gap-1.5 ${
              isOutOfStockDisabled
                ? "opacity-35 cursor-not-allowed bg-[#FAF6F0] text-[#9C8274] border border-[#DCC7B7]/50"
                : stockStatus === "out_of_stock"
                ? "bg-[#991B1B] text-white border border-[#991B1B] shadow-xs cursor-pointer"
                : "bg-white text-[#4A3228] border border-[#DCC7B7] hover:bg-[#FAF6F0] cursor-pointer"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOutOfStockDisabled ? "bg-[#9C8274]/50" : "bg-red-500"
              }`}
            />
            Out of Stock
          </button>
        </div>
      </div>

      {/* 5. Dietary (Veg / Non-Veg) Pills */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]">
          Dietary
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isVegDisabled}
            onClick={() => {
              if (isVegDisabled) return;
              onVegTypeChange(vegType === "veg" ? "all" : "veg");
            }}
            title={isVegDisabled ? "No pure veg snacks available" : undefined}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all select-none flex items-center gap-1.5 ${
              isVegDisabled
                ? "opacity-35 cursor-not-allowed bg-[#FAF6F0] text-[#9C8274] border border-[#DCC7B7]/50"
                : vegType === "veg"
                ? "bg-emerald-700 text-white border border-emerald-700 shadow-xs cursor-pointer"
                : "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 cursor-pointer"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isVegDisabled ? "bg-[#9C8274]/50" : "bg-green-500"
              }`}
            />
            Veg
          </button>

          <button
            type="button"
            disabled={isVeganDisabled}
            onClick={() => {
              if (isVeganDisabled) return;
              onVegTypeChange(vegType === "vegan" ? "all" : "vegan");
            }}
            title={isVeganDisabled ? "No vegan snacks available" : undefined}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all select-none flex items-center gap-1.5 ${
              isVeganDisabled
                ? "opacity-35 cursor-not-allowed bg-[#FAF6F0] text-[#9C8274] border border-[#DCC7B7]/50"
                : vegType === "vegan"
                ? "bg-teal-700 text-white border border-teal-700 shadow-xs cursor-pointer"
                : "bg-white text-teal-800 border border-teal-300 hover:bg-teal-50 cursor-pointer"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isVeganDisabled ? "bg-[#9C8274]/50" : "bg-teal-500"
              }`}
            />
            Vegan
          </button>

          <button
            type="button"
            disabled={isNonVegDisabled}
            onClick={() => {
              if (isNonVegDisabled) return;
              onVegTypeChange(vegType === "non_veg" ? "all" : "non_veg");
            }}
            title={isNonVegDisabled ? "No non-veg snacks available" : undefined}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all select-none flex items-center gap-1.5 ${
              isNonVegDisabled
                ? "opacity-35 cursor-not-allowed bg-[#FAF6F0] text-[#9C8274] border border-[#DCC7B7]/50"
                : vegType === "non_veg"
                ? "bg-red-700 text-white border border-red-700 shadow-xs cursor-pointer"
                : "bg-white text-red-800 border border-red-300 hover:bg-red-50 cursor-pointer"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isNonVegDisabled ? "bg-[#9C8274]/50" : "bg-red-500"
              }`}
            />
            Non-Veg
          </button>
        </div>
      </div>

      {/* 6. Categories -> Product List Nested Tree (Matching Image 3 on light theme) */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-[#F0E4D8]">
        <button
          type="button"
          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
          className="flex items-center justify-between w-full text-left cursor-pointer group select-none"
        >
          <span className="text-sm font-extrabold text-[#2D1810] tracking-wide">
            Categories & Products
          </span>
          {isCategoriesOpen ? (
            <ChevronUp className="w-4 h-4 text-[#7A6258] group-hover:text-[#2D1810] transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#7A6258] group-hover:text-[#2D1810] transition-colors" />
          )}
        </button>

        {isCategoriesOpen && (
          <div className="flex flex-col gap-2 mt-1 animate-in fade-in duration-200">
            {/* Inline search box for 200+ categories (only in multi-category mode) */}
            {!isSingleCategoryMode && categories.length > 5 && (
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9C8274]" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full bg-[#FAF6F0] border border-[#DCC7B7] rounded-lg pl-8.5 pr-7 py-1.5 text-xs text-[#2D1810] placeholder-[#A0887A] focus:outline-none focus:border-[#7A2224] transition-all"
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C8274] hover:text-[#2D1810] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable category list with expandable nested products */}
            <div className="max-h-72 overflow-y-auto flex flex-col gap-2 pr-1.5 scrollbar-thin scrollbar-thumb-[#DCC7B7] scrollbar-track-transparent">
              {/* Option: All Snacks (only in multi-category mode) */}
              {!isSingleCategoryMode && !categorySearch && (
                <button
                  type="button"
                  onClick={handleAllSnacksClick}
                  className={`flex items-center gap-2.5 py-1 text-left cursor-pointer group transition-colors select-none ${
                    activeCategoryIds.length === 0 && activeProductIds.length === 0
                      ? "text-[#1E4D3E] font-bold"
                      : "text-[#3D2C24] hover:text-[#1E4D3E] font-medium"
                  }`}
                >
                  <span
                    className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      activeCategoryIds.length === 0 && activeProductIds.length === 0
                        ? "border-[#1E4D3E] bg-[#1E4D3E] text-white shadow-2xs"
                        : "border-[#8A7366] bg-white group-hover:border-[#1E4D3E]"
                    }`}
                  >
                    {activeCategoryIds.length === 0 && activeProductIds.length === 0 && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </span>
                  <span
                    className={`text-sm ${
                      activeCategoryIds.length === 0 && activeProductIds.length === 0
                        ? "underline underline-offset-4 decoration-2 decoration-[#1E4D3E]"
                        : ""
                    }`}
                  >
                    All Snacks
                  </span>
                </button>
              )}

              {/* Shimmer loading state when categories are being fetched from API */}
              {isLoadingCategories ? (
                <div className="flex flex-col gap-2.5 py-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-4.5 h-4.5 rounded-md bg-[#EADCCF]/80 skeleton-shimmer shrink-0" />
                        <div
                          className="h-3.5 rounded bg-[#EADCCF]/80 skeleton-shimmer"
                          style={{ width: `${45 + (i % 3) * 20}%` }}
                        />
                      </div>
                      {!isSingleCategoryMode && (
                        <div className="w-3.5 h-3.5 rounded bg-[#EADCCF]/60 skeleton-shimmer" />
                      )}
                    </div>
                  ))}
                </div>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => {
                  const isSelected = isSingleCategoryMode ? true : isCategoryActive(cat.id);
                  const isExpanded = isSingleCategoryMode ? true : expandedCategoryIds.has(cat.id);
                  const products = categoryProducts[cat.id] || [];
                  const isLoadingProducts = loadingCategoryIds.has(cat.id);

                  return (
                    <div key={cat.id} className="flex flex-col">
                      {/* Category Row */}
                      <div className="flex items-center justify-between group py-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSingleCategoryMode) {
                              handleAllInCategoryClick(cat.id);
                            } else {
                              handleCategoryToggle(cat.id);
                              if (!isExpanded) toggleCategoryExpand(cat.id);
                            }
                          }}
                          className={`flex items-center gap-2.5 text-left cursor-pointer flex-1 min-w-0 select-none ${
                            isSelected
                              ? "text-[#1E4D3E] font-bold"
                              : "text-[#3D2C24] hover:text-[#1E4D3E] font-medium"
                          }`}
                        >
                          <span
                            className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? "border-[#1E4D3E] bg-[#1E4D3E] text-white shadow-2xs"
                                : "border-[#8A7366] bg-white group-hover:border-[#1E4D3E]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </span>
                          <span
                            className={`text-sm truncate ${
                              isSelected && activeProductIds.length === 0
                                ? "underline underline-offset-4 decoration-2 decoration-[#1E4D3E]"
                                : ""
                            }`}
                            title={cat.name}
                          >
                            {cat.name}
                          </span>
                        </button>

                        {/* Expand/Collapse Chevron Button (hidden in single category mode) */}
                        {!isSingleCategoryMode && (
                          <button
                            type="button"
                            onClick={(e) => toggleCategoryExpand(cat.id, e)}
                            className="p-1 rounded-md text-[#7A6258] hover:text-[#2D1810] hover:bg-[#F5ECE1] transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse products" : "Expand products"}
                            aria-label={isExpanded ? "Collapse products" : "Expand products"}
                          >
                            {isLoadingProducts ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7A2224]" />
                            ) : isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#7A2224]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#9C8274]" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Nested Products List underneath this Category */}
                      {isExpanded && (
                        <div className="pl-6 pr-1 pt-1 pb-1.5 flex flex-col gap-1.5 border-l-2 border-[#EADCCF] ml-2.5 my-1 animate-in fade-in duration-150">
                          {/* Option: All in this Category when in single category mode */}
                          {isSingleCategoryMode && (
                            <button
                              type="button"
                              onClick={() => handleAllInCategoryClick(cat.id)}
                              className={`flex items-center gap-2 py-0.5 text-left cursor-pointer group transition-colors select-none ${
                                activeProductIds.length === 0
                                  ? "text-[#1E4D3E] font-bold"
                                  : "text-[#5A4338] hover:text-[#1E4D3E] font-medium"
                              }`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                  activeProductIds.length === 0
                                    ? "border-[#1E4D3E] bg-[#1E4D3E] text-white shadow-2xs"
                                    : "border-[#9C8274] bg-white group-hover:border-[#1E4D3E]"
                                }`}
                              >
                                {activeProductIds.length === 0 && (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                )}
                              </span>
                              <span
                                className={`text-xs truncate ${
                                  activeProductIds.length === 0
                                    ? "underline underline-offset-2 decoration-1 decoration-[#1E4D3E]"
                                    : ""
                                }`}
                              >
                                All in {cat.name}
                              </span>
                            </button>
                          )}

                          {isLoadingProducts ? (
                            <div className="flex items-center gap-2 py-1 text-xs text-[#9C8274]">
                              <Loader2 className="w-3 h-3 animate-spin text-[#7A2224]" />
                              Loading products...
                            </div>
                          ) : products.length > 0 ? (
                            products.map((prod) => {
                              const isProductActive = activeProductIds.includes(prod.id);
                              return (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => handleProductToggle(prod.id, cat.id)}
                                  className={`flex items-center gap-2 py-0.5 text-left cursor-pointer group transition-colors select-none ${
                                    isProductActive
                                      ? "text-[#1E4D3E] font-bold"
                                      : "text-[#5A4338] hover:text-[#1E4D3E] font-medium"
                                  }`}
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                      isProductActive
                                        ? "border-[#1E4D3E] bg-[#1E4D3E] text-white shadow-2xs"
                                        : "border-[#9C8274] bg-white group-hover:border-[#1E4D3E]"
                                    }`}
                                  >
                                    {isProductActive && (
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    )}
                                  </span>
                                  <span
                                    className={`text-xs truncate ${
                                      isProductActive
                                        ? "underline underline-offset-2 decoration-1 decoration-[#1E4D3E]"
                                        : ""
                                    }`}
                                    title={prod.name}
                                  >
                                    {prod.name}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-xs text-[#9C8274] italic py-0.5">
                              No products found
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[#9C8274] py-2 text-center">
                  No categories match &ldquo;{categorySearch}&rdquo;
                </div>
              )}

              {/* View All Categories Link when in single category mode */}
              {isSingleCategoryMode && (
                <div className="pt-2 mt-2 border-t border-[#F0E4D8]">
                  <Link
                    href={viewAllCategoriesHref}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#7A2224] hover:text-[#5A1911] hover:underline transition-colors py-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>View All Categories</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. Budget / Price Range Slider */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[#F0E4D8]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6258]">
            Budget
          </span>
          <span className="text-xs font-bold text-[#7A2224]">
            {formatPrice(localMinPrice)} – {formatPrice(localMaxPrice)}
          </span>
        </div>

        {/* Dual Thumb Range Track */}
        <div className="relative pt-3 pb-2 px-1">
          {/* Base track */}
          <div className="w-full h-2 bg-[#EADCCF] rounded-full relative">
            {/* Active highlighted range */}
            <div
              className="absolute h-2 bg-[#7A2224] rounded-full"
              style={{
                left: `${priceMinPercent}%`,
                width: `${Math.max(0, priceMaxPercent - priceMinPercent)}%`,
              }}
            />
          </div>

          {/* Overlaid native range inputs for dual thumb operation */}
          <input
            type="range"
            min={minPriceLimit}
            max={maxPriceLimit}
            step={10}
            value={localMinPrice}
            onChange={(e) => {
              const val = Math.min(Number(e.target.value), localMaxPrice - 10);
              setLocalMinPrice(val);
            }}
            className="absolute top-2.5 left-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7A2224] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
          />

          <input
            type="range"
            min={minPriceLimit}
            max={maxPriceLimit}
            step={10}
            value={localMaxPrice}
            onChange={(e) => {
              const val = Math.max(Number(e.target.value), localMinPrice + 10);
              setLocalMaxPrice(val);
            }}
            className="absolute top-2.5 left-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7A2224] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
          />
        </div>

        {/* Min / Max Price Value Bubbles */}
        <div className="flex items-center justify-between text-xs font-bold text-[#7A6258] pt-1">
          <span className="bg-[#FAF6F0] px-2.5 py-1 rounded-md border border-[#DCC7B7] text-[#2D1810]">
            {formatPrice(localMinPrice)}
          </span>
          <span className="text-[#9C8274]">—</span>
          <span className="bg-[#FAF6F0] px-2.5 py-1 rounded-md border border-[#DCC7B7] text-[#2D1810]">
            {formatPrice(localMaxPrice)}
            {localMaxPrice >= maxPriceLimit ? "" : ""}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block w-72 xl:w-84 shrink-0 bg-white border border-[#E8D9CD] rounded-2xl p-5 xl:p-6 shadow-xs sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#DCC7B7] scrollbar-track-transparent ${className}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer Modal */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-in drawer */}
          <div className="relative ml-0 w-full max-w-xs sm:max-w-sm h-full bg-white border-r border-[#E8D9CD] p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300 z-10">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F0E4D8]">
                <span className="font-extrabold text-base text-[#2D1810]">Filters</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-[#7A6258] hover:text-[#2D1810] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sidebarContent}
            </div>

            {/* Mobile Apply Button */}
            <div className="pt-5 mt-5 border-t border-[#F0E4D8]">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full py-3 rounded-xl bg-[#7A2224] hover:bg-[#5A1911] text-white font-extrabold text-sm tracking-wide uppercase transition-all shadow-sm cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FilterSidebar;
