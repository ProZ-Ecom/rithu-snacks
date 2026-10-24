"use client";

import * as React from "react";
import Link from "next/link";
import { ICONS, CATEGORYLOGOS } from "@/constants/storefront";
import { SectionHeading } from "./heading/SectionHeading";
import { Section } from "./Section";
import { useCustomerCategories, type CustomerCategoryDto } from "@/features/categories";
import { getImageUrl } from "@/lib/utils";

const fallbackCategoryLogos: Record<string, string> = {
  "flavors & spices": CATEGORYLOGOS.flavourSpices,
  "sweets": CATEGORYLOGOS.sweet,
  "healthy bites": CATEGORYLOGOS.bites,
  "traditional delights": CATEGORYLOGOS.traditional,
  "bakery": CATEGORYLOGOS.bakery,
  "chips": CATEGORYLOGOS.chips,
  "namkeen": CATEGORYLOGOS.flavourSpices,
  "snacks": CATEGORYLOGOS.traditional,
  "cakes": CATEGORYLOGOS.bakery,
};

function resolveCategoryImage(category: CustomerCategoryDto): string {
  if (category.image?.trim()) {
    return getImageUrl(category.image);
  }

  const normalizedName = category.name.trim().toLowerCase();
  return fallbackCategoryLogos[normalizedName] || CATEGORYLOGOS.traditional;
}

export function CategorySection() {
  const { data: response, isLoading } = useCustomerCategories({
    page: 1,
    pageSize: 50, // same params as the header menus so React Query serves one shared request
    sortBy: "name",
    sortOrder: "asc",
  });

  const rawCategories = response?.data || [];

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const singleSetRef = React.useRef<HTMLDivElement>(null);

  // needsScroll is true ONLY when the actual categories exceed available screen/container width
  const [needsScroll, setNeedsScroll] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isManualInteracting, setIsManualInteracting] = React.useState(false);
  const interactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // High-precision subpixel accumulator to ensure fluid 60fps/120fps motion without DOM truncation hangs
  const posRef = React.useRef<number>(0);

  // Measure if the single set of categories actually overflows the visible container width
  const checkNeedsScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    const singleSet = singleSetRef.current;
    if (!container || !singleSet) return;

    // If single set width exceeds the container width, scrolling is required
    const isOverflowing = singleSet.offsetWidth > container.clientWidth + 4;
    setNeedsScroll(isOverflowing);
  }, []);

  React.useEffect(() => {
    checkNeedsScroll();
    const container = scrollContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      checkNeedsScroll();
    });
    ro.observe(container);
    if (singleSetRef.current) {
      ro.observe(singleSetRef.current);
    }
    window.addEventListener("resize", checkNeedsScroll);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", checkNeedsScroll);
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [checkNeedsScroll, rawCategories.length]);

  // Sync posRef with container.scrollLeft when user manually scrolls or touches
  const handleScroll = React.useCallback(() => {
    if (scrollContainerRef.current && isManualInteracting) {
      posRef.current = scrollContainerRef.current.scrollLeft;
    }
  }, [isManualInteracting]);

  // Desktop hover guard: only pause for mouse devices, preventing mobile touch from locking hover
  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Helper to compute exact loop width (single set width + flex gap)
  const getLoopWidth = React.useCallback(() => {
    const container = scrollContainerRef.current;
    const singleSet = singleSetRef.current;
    if (!container || !singleSet) return 0;
    const styles = getComputedStyle(container);
    const gap = parseFloat(styles.columnGap || styles.gap || "16");
    return singleSet.offsetWidth + gap;
  }, []);

  // Buttery-smooth, fluid auto-scroll animation loop (runs ONLY when needsScroll is true)
  React.useEffect(() => {
    if (!needsScroll || isHovered || isManualInteracting) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    posRef.current = container.scrollLeft;

    let animationFrameId: number;
    let lastTime = performance.now();
    const pixelsPerSecond = 45; // Fluid, lively, and comfortable reading speed

    const step = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (container) {
        posRef.current += pixelsPerSecond * delta;

        const loopWidth = getLoopWidth();
        if (loopWidth > 0 && posRef.current >= loopWidth) {
          posRef.current -= loopWidth;
        }

        container.scrollLeft = posRef.current;
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [needsScroll, isHovered, isManualInteracting, getLoopWidth]);

  // Manual navigation handlers
  const handleNext = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsManualInteracting(true);
    const step = Math.max(160, container.clientWidth * 0.6);
    container.scrollBy({ left: step, behavior: "smooth" });
    posRef.current = container.scrollLeft + step;

    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        posRef.current = scrollContainerRef.current.scrollLeft;
      }
      setIsManualInteracting(false);
    }, 3500);
  };

  const handlePrevious = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsManualInteracting(true);
    const step = Math.max(160, container.clientWidth * 0.6);
    const loopWidth = getLoopWidth();

    if (loopWidth > 0 && container.scrollLeft < step) {
      container.scrollLeft += loopWidth;
      posRef.current += loopWidth;
    }

    container.scrollBy({ left: -step, behavior: "smooth" });
    posRef.current = Math.max(0, container.scrollLeft - step);

    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        posRef.current = scrollContainerRef.current.scrollLeft;
      }
      setIsManualInteracting(false);
    }, 3500);
  };

  const renderCategoryCard = (category: CustomerCategoryDto, index: number, keyPrefix = "") => {
    const imageUrl = resolveCategoryImage(category);

    return (
      <Link
        key={`${keyPrefix}-${category.id}-${index}`}
        href={`/categories/${category.id}`}
        className="flex flex-col items-center shrink-0 group cursor-pointer select-none focus:outline-none"
      >
        {/* Circular Avatar Container */}
        <div
          className="
            relative
            w-20
            sm:w-24
            md:w-28
            lg:w-32
            aspect-square
            rounded-full
            overflow-hidden
            isolate
            bg-white

         
            group-hover:border-theme-primary/50
            shadow-xs
            group-hover:shadow-md
            transition-all
            duration-300
            flex
            items-center
            justify-center
            p-1.5
            sm:p-2
          "
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <img
            src={imageUrl}
            alt={category.name}
            className="w-full h-full object-contain rounded-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Category Name: uniform 2-line height so 1-line and 2-line titles have identical card height */}
        <span
          className="
            mt-2.5
            sm:mt-3
            text-center
            text-xs
            sm:text-sm
            font-medium
            text-theme-text-primary
            group-hover:text-theme-primary
            transition-colors
            duration-200
            line-clamp-2
            max-w-[80px]
            sm:max-w-[96px]
            md:max-w-[112px]
            lg:max-w-[128px]
            leading-tight
            h-[32px]
            sm:h-[36px]
            flex
            items-start
            justify-center
          "
        >
          {category.name}
        </span>
      </Link>
    );
  };

  return (
    <Section>
      <SectionHeading title="Explore by category" />

      {/* Main Slider Track:
          - On mobile (< md): relative container with absolute transparent buttons (takes 0 width)
          - On desktop (md+): flex layout with solid themed buttons inline
      */}
      <div className="relative md:flex md:items-center md:gap-3 lg:gap-5 w-full">
        {/* Left Button: rendered ONLY when scrolling is needed */}
        {needsScroll && (
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Previous Categories"
            className="
              absolute
              left-0
              top-1/2
              -translate-y-1/2
              z-20
              w-8
              h-12
              flex
              items-center
              justify-center
              bg-transparent
              border-0
              shadow-none
              cursor-pointer
              transition-all
              duration-200
              md:static
              md:translate-y-0
              md:w-8
              md:h-8
              lg:w-9
              lg:h-9
              md:rounded-lg
              md:bg-theme-surface
              md:border
              md:border-theme-border/80
              md:shadow-2xs
              md:hover:bg-theme-surface-alt
              md:shrink-0
            "
          >
            <img
              src={ICONS.rightButton}
              alt="Previous"
              className="w-4 h-4 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 invert rotate-180 opacity-70 hover:opacity-100 md:opacity-100 transition-opacity"
            />
          </button>
        )}

        {/* Categories Container:
            - If needsScroll: horizontal fluid scroll ticker with touch momentum
            - If !needsScroll: centered statically on 1 row without buttons or auto-scroll
        */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`w-full md:flex-1 flex items-center flex-nowrap gap-4 sm:gap-6 md:gap-8 py-2 px-2 sm:px-4 md:px-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            needsScroll ? "justify-start" : "justify-center"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={() => setIsManualInteracting(true)}
          onTouchEnd={() => {
            if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
            interactionTimeoutRef.current = setTimeout(() => {
              if (scrollContainerRef.current) {
                posRef.current = scrollContainerRef.current.scrollLeft;
              }
              setIsManualInteracting(false);
            }, 2000);
          }}
          onTouchCancel={() => {
            if (scrollContainerRef.current) {
              posRef.current = scrollContainerRef.current.scrollLeft;
            }
            setIsManualInteracting(false);
          }}
        >
          {isLoading ? (
            <div className="flex justify-center items-center gap-4 sm:gap-6 md:gap-8 py-2 w-full">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex flex-col items-center shrink-0 animate-pulse"
                >
                  <div className="w-20 sm:w-24 md:w-28 lg:w-32 aspect-square rounded-full bg-theme-surface-alt border border-theme-border" />
                  <div className="mt-2.5 h-3.5 w-16 sm:w-20 bg-theme-surface-alt rounded" />
                </div>
              ))}
            </div>
          ) : rawCategories.length > 0 ? (
            <>
              {/* Primary set of categories: measured to check if it fits available width */}
              <div
                ref={singleSetRef}
                className="flex items-center flex-nowrap gap-4 sm:gap-6 md:gap-8 shrink-0"
              >
                {rawCategories.map((cat, idx) => renderCategoryCard(cat, idx, "set1"))}
              </div>

              {/* Duplicate set: ONLY rendered when needsScroll is true for seamless infinite looping */}
              {needsScroll && (
                <div className="flex items-center flex-nowrap gap-4 sm:gap-6 md:gap-8 shrink-0">
                  {rawCategories.map((cat, idx) => renderCategoryCard(cat, idx, "set2"))}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-sm text-theme-text-muted w-full">
              No categories available at the moment.
            </div>
          )}
        </div>

        {/* Right Button: rendered ONLY when scrolling is needed */}
        {needsScroll && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Categories"
            className="
              absolute
              right-0
              top-1/2
              -translate-y-1/2
              z-20
              w-8
              h-12
              flex
              items-center
              justify-center
              bg-transparent
              border-0
              shadow-none
              cursor-pointer
              transition-all
              duration-200
              md:static
              md:translate-y-0
              md:w-8
              md:h-8
              lg:w-9
              lg:h-9
              md:rounded-lg
              md:bg-theme-surface
              md:border
              md:border-theme-border/80
              md:shadow-2xs
              md:hover:bg-theme-surface-alt
              md:shrink-0
            "
          >
            <img
              src={ICONS.rightButton}
              alt="Next"
              className="w-4 h-4 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 invert opacity-70 hover:opacity-100 md:opacity-100 transition-opacity"
            />
          </button>
        )}
      </div>
    </Section>
  );
}

export default CategorySection;
