import { db } from "@/lib/db/prisma";
import type { PaginationMeta } from "@/lib/api/api-response";
import type { Prisma } from "@/generated/prisma";
import {
  formatVariantMeasurement,
  formatMeasurementLabel,
} from "@/features/variants/utils/measurement.util";
import type {
  CustomerBrandListInput,
  CustomerCategoryListInput,
  CustomerProductListInput,
  CustomerVariantListInput,
  CustomerGlobalVariantListInput,
  CustomerRelatedVariantsQueryInput,
} from "../validations/catalog.schema";
import type {
  CustomerBrandDto,
  CustomerCategoryDto,
  CustomerProductListItemDto,
  CustomerProductDetailDto,
  CustomerProductImageDto,
  CustomerVariantListItemDto,
  CustomerVariantDetailDto,
  CustomerVariantImageDto,
  CustomerVariantUnitPriceDto,
  CustomerRelatedVariantDto,
  CustomerPopularSearchResponse,
  CustomerTrackSearchInput,
} from "../types/catalog.types";

/**
 * Selling price is not stored on the unit price row - it is basePrice minus
 * any active offer/discount, computed here at read time. No offer/discount
 * engine is wired up for the storefront yet, so this currently returns
 * basePrice unchanged. When one exists, apply it here so every price shown
 * to customers (list, detail, cart, wishlist) flows through this single
 * function instead of reading base_price directly.
 */
/**
 * The repository deals in catalog prices only. Offers are applied one layer
 * up, in `catalogOffers`, because resolving them needs a database round trip
 * and is done once per page of results rather than once per row.
 */
function computeSellingPrice(basePrice: number): number {
  return basePrice;
}

// Unit prices are always loaded with this shape when we need to derive a
// variant's display sku/price/measurement (the storefront still shows one
// price per variant - the default unit price - since cart/wishlist/orders
// key off the item-level variant, not a specific unit price).
const unitPriceListArgs = {
  where: { deleted_at: null, isActive: true },
  include: {
    product_units: {
      select: { id: true, uuid: true, name: true, code: true, type: true },
    },
  },
  orderBy: [{ is_default: "desc" as const }, { createdAt: "asc" as const }],
};

type VariantUnitPriceForDto = {
  uuid: string;
  sku: string;
  base_price: Prisma.Decimal | number;
  unit_value: Prisma.Decimal | number;
  is_default: boolean;
  product_units: { id: bigint; uuid: string | null; name: string; code: string; type: string } | null;
};

function pickDefaultUnitPrice(
  unitPrices: VariantUnitPriceForDto[] | null | undefined
): VariantUnitPriceForDto | null {
  if (!unitPrices || unitPrices.length === 0) return null;
  return unitPrices.find((up) => up.is_default) ?? unitPrices[0];
}

function toVariantListItemDto(
  variant: {
    id: bigint;
    uuid: string;
    variant_name: string | null;
    out_of_stock?: boolean;
    is_featured?: boolean;
    ingredients?: string | null;
    is_ready_to_mix?: boolean;
    cooking_recipe?: string | null;
    shelf_life?: string | null;
    variant_unit_prices?: VariantUnitPriceForDto[] | null;
    product_variant_images?: Array<{
      id?: bigint;
      uuid?: string | null;
      image_url: string;
      sort_order?: number;
      is_primary?: boolean;
    }> | null;
  },
  productUuid: string,
  productName: string,
  fallbackImageUrl?: string | null
): CustomerVariantListItemDto {
  const defaultUnitPrice = pickDefaultUnitPrice(variant.variant_unit_prices);

  const unitPrices: CustomerVariantUnitPriceDto[] = (
    variant.variant_unit_prices || []
  ).map((up) => {
    const basePrice = Number(up.base_price);
    return {
      id: up.uuid,
      sku: up.sku,
      measurement: formatVariantMeasurement(up.product_units, up.unit_value ?? 0),
      basePrice,
      sellingPrice: computeSellingPrice(basePrice),
      isDefault: Boolean(up.is_default),
    };
  });

  return {
    id: variant.uuid || String(variant.id),
    productId: productUuid,
    productName,
    variantName: variant.variant_name || "",
    measurement: formatVariantMeasurement(
      defaultUnitPrice?.product_units,
      defaultUnitPrice?.unit_value ?? 0
    ),
    sku: defaultUnitPrice?.sku ?? "",
    basePrice: defaultUnitPrice ? Number(defaultUnitPrice.base_price) : 0,
    // Selling price is not stored - it is basePrice minus any active
    // offer/discount (see computeSellingPrice). Mirrored here for callers
    // that still read `salePrice` directly instead of `unitPrices`.
    salePrice: defaultUnitPrice
      ? computeSellingPrice(Number(defaultUnitPrice.base_price))
      : 0,
    primaryImage: variant.product_variant_images?.[0]?.image_url ?? fallbackImageUrl ?? null,
    images: (variant.product_variant_images || []).map((img, idx) => ({
      id: img.uuid || String((img as { id?: bigint }).id ?? idx),
      imageUrl: img.image_url,
      sortOrder: (img as { sort_order?: number }).sort_order ?? idx,
      isPrimary: Boolean((img as { is_primary?: boolean }).is_primary ?? (idx === 0)),
    })),
    outOfStock: Boolean(variant.out_of_stock),
    isFeatured: Boolean(variant.is_featured),
    ingredients: variant.ingredients ?? null,
    isReadyToMix: Boolean(variant.is_ready_to_mix),
    cookingRecipe: variant.cooking_recipe ?? null,
    shelfLife: variant.shelf_life ?? null,
    unitPrices,
  };
}

export const catalogRepository = {
  // ----------------------------------------------------
  // BRAND REPOSITORY METHODS
  // ----------------------------------------------------
  async findCustomerBrands(params: CustomerBrandListInput) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ProductBrandWhereInput = {
      isActive: true,
      deleted_at: null,
      status: true,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    const orderBy: Prisma.ProductBrandOrderByWithRelationInput =
      params.sortBy === "createdAt"
        ? { createdAt: params.sortOrder ?? "asc" }
        : { name: params.sortOrder ?? "asc" };

    const [brands, total] = await Promise.all([
      db.productBrand.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          produt_brand_images: {
            where: { is_active: true },
            take: 1,
          },
        },
      }),
      db.productBrand.count({ where }),
    ]);

    const data: CustomerBrandDto[] = brands.map((b) => ({
      id: b.uuid || String(b.id),
      name: b.name,
      image: b.produt_brand_images[0]?.image_url ?? null,
    }));

    return {
      data,
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async findCustomerBrandByUuid(uuid: string): Promise<CustomerBrandDto | null> {
    const brand = await db.productBrand.findFirst({
      where: {
        uuid,
        isActive: true,
        deleted_at: null,
        status: true,
      },
      include: {
        produt_brand_images: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!brand) return null;

    return {
      id: brand.uuid || String(brand.id),
      name: brand.name,
      image: brand.produt_brand_images[0]?.image_url ?? null,
    };
  },

  // ----------------------------------------------------
  // CATEGORY REPOSITORY METHODS
  // ----------------------------------------------------
  async findCustomerCategories(params: CustomerCategoryListInput) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ProductCategoryWhereInput = {
      isActive: true,
      deleted_at: null,
      status: true,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    const orderBy: Prisma.ProductCategoryOrderByWithRelationInput =
      params.sortBy === "createdAt"
        ? { createdAt: params.sortOrder ?? "asc" }
        : { name: params.sortOrder ?? "asc" };

    const [categories, total] = await Promise.all([
      db.productCategory.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product_category_images: {
            where: { is_active: true },
            take: 1,
          },
        },
      }),
      db.productCategory.count({ where }),
    ]);

    const data: CustomerCategoryDto[] = categories.map((c) => ({
      id: c.uuid || String(c.id),
      name: c.name,
      image: c.icon || c.product_category_images[0]?.image_url || null,
    }));

    return {
      data,
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async findCustomerCategoryByUuid(uuid: string): Promise<CustomerCategoryDto | null> {
    const category = await db.productCategory.findFirst({
      where: {
        uuid,
        isActive: true,
        deleted_at: null,
        status: true,
      },
      include: {
        product_category_images: {
          where: { is_active: true },
          take: 1,
        },
      },
    });

    if (!category) return null;

    return {
      id: category.uuid || String(category.id),
      name: category.name,
      image: category.icon || category.product_category_images[0]?.image_url || null,
    };
  },

  // ----------------------------------------------------
  // PRODUCT REPOSITORY METHODS
  // ----------------------------------------------------
  async findCustomerProducts(params: CustomerProductListInput) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deleted_at: null,
    };

    // Filter by Brand UUIDs
    if (params.brandIds && params.brandIds.length > 0) {
      const matchingBrands = await db.productBrand.findMany({
        where: { uuid: { in: params.brandIds }, isActive: true, deleted_at: null },
        select: { id: true },
      });
      where.brandId = { in: matchingBrands.map((b) => b.id) };
    }

    // Filter by Category UUIDs
    if (params.categoryIds && params.categoryIds.length > 0) {
      const matchingCategories = await db.productCategory.findMany({
        where: { uuid: { in: params.categoryIds }, isActive: true, deleted_at: null },
        select: { id: true },
      });
      where.categoryId = { in: matchingCategories.map((c) => c.id) };
    }

    // Filter by Product UUIDs
    if (params.productIds && params.productIds.length > 0) {
      where.uuid = { in: params.productIds };
    }

    // Search filter
    if (params.search) {
      where.OR = [{ name: { contains: params.search } }];
    }

    // Variant-level filters (inStock, vegType, price range)
    const variantWhere: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deleted_at: null,
    };

    if (params.inStock !== undefined) {
      variantWhere.out_of_stock = !params.inStock;
    }

    if (params.vegType) {
      const mappedVegType =
        params.vegType === "non_veg" || params.vegType === "nonveg"
          ? ("nonveg" as const)
          : (params.vegType as "veg" | "vegan" | "na");
      variantWhere.veg_type = mappedVegType;
    }

    const minProductP = params.minPrice ? Math.max(params.minPrice, 0.01) : 0.01;
    const maxProductP = params.maxPrice ?? Number.MAX_SAFE_INTEGER;
    variantWhere.variant_unit_prices = {
      some: {
        deleted_at: null,
        isActive: true,
        base_price: { gte: minProductP, lte: maxProductP },
      },
    };

    where.variants = { some: variantWhere };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (params.sortBy === "name") {
      orderBy = { name: params.sortOrder ?? "asc" };
    } else if (params.sortBy === "createdAt") {
      orderBy = { createdAt: params.sortOrder ?? "desc" };
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: params.sortBy === "price" ? undefined : orderBy,
        ...(params.sortBy === "price" ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        include: {
          brand: { select: { id: true, uuid: true, name: true } },
          images: {
            where: { is_active: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
          variants: {
            where: {
              isActive: true,
              deleted_at: null,
              variant_unit_prices: {
                some: {
                  deleted_at: null,
                  isActive: true,
                  base_price: { gt: 0 },
                },
              },
            },
            include: {
              product_variant_images: {
                where: { is_active: true },
                orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
                take: 1,
              },
              variant_unit_prices: unitPriceListArgs,
            },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    // Map each product & calculate minPrice/maxPrice across all variants' unit prices
    let items: CustomerProductListItemDto[] = products.map((p) => {
      const allPrices = p.variants.flatMap((v) =>
        (v.variant_unit_prices || []).map((up) => Number(up.base_price))
      );

      let minP = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      let maxP = allPrices.length > 0 ? Math.max(...allPrices) : 0;

      // Resolve primary image from product.images or variant images
      let imgUrl: string | null = p.images[0]?.image_url ?? null;
      if (!imgUrl && p.variants.length > 0) {
        imgUrl = p.variants[0].product_variant_images[0]?.image_url ?? null;
      }

      const primaryVariant =
        p.variants.find((v) => v.is_default) ?? p.variants[0] ?? null;

      // Extract all active unit prices from the primary variant or variants with unit prices
      const variantWithPrices =
        p.variants.find((v) => (v.variant_unit_prices || []).length > 0) ?? primaryVariant;

      const unitPrices = (variantWithPrices?.variant_unit_prices || []).map((up) => {
        const basePrice = Number(up.base_price);
        const measurement = formatVariantMeasurement(up.product_units, up.unit_value ?? 0);
        return {
          id: up.uuid,
          label: formatMeasurementLabel(measurement) || "Standard",
          basePrice,
          sellingPrice: computeSellingPrice(basePrice),
        };
      });

      return {
        id: p.uuid || String(p.id),
        name: p.name,
        description:
          primaryVariant?.short_description || primaryVariant?.description || null,
        brand: p.brand
          ? {
              id: p.brand.uuid || String(p.brand.id),
              name: p.brand.name,
            }
          : null,
        category: null,
        image: imgUrl,
        minPrice: minP,
        maxPrice: maxP,
        unitPrices,
      };
    });

    // Populate category UUID/name if categoryId exists
    const categoryIds = products
      .map((p) => p.categoryId)
      .filter((id): id is bigint => id !== null && id !== undefined);

    if (categoryIds.length > 0) {
      const categories = await db.productCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, uuid: true, name: true },
      });
      const catMap = new Map(categories.map((c) => [c.id.toString(), c]));

      products.forEach((p, idx) => {
        if (p.categoryId) {
          const cat = catMap.get(p.categoryId.toString());
          if (cat) {
            items[idx].category = {
              id: cat.uuid || String(cat.id),
              name: cat.name,
            };
          }
        }
      });
    }

    // Handle price sorting in JavaScript if requested
    if (params.sortBy === "price") {
      const isAsc = params.sortOrder === "asc";
      items.sort((a, b) => (isAsc ? a.minPrice - b.minPrice : b.minPrice - a.minPrice));
      items = items.slice((page - 1) * pageSize, page * pageSize);
    }

    return {
      data: items,
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async findCustomerProductByUuid(uuid: string): Promise<CustomerProductDetailDto | null> {
    const product = await db.product.findFirst({
      where: {
        uuid,
        isActive: true,
        deleted_at: null,
      },
      include: {
        brand: { select: { id: true, uuid: true, name: true } },
        images: {
          where: { is_active: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          where: {
            isActive: true,
            deleted_at: null,
            variant_unit_prices: {
              some: {
                deleted_at: null,
                isActive: true,
                base_price: { gt: 0 },
              },
            },
          },
          include: {
            product_variant_images: {
              where: { is_active: true },
              orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            },
            variant_unit_prices: unitPriceListArgs,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) return null;

    let categoryDto: { id: string; name: string } | null = null;
    if (product.categoryId) {
      const cat = await db.productCategory.findFirst({
        where: { id: product.categoryId },
        select: { id: true, uuid: true, name: true },
      });
      if (cat) {
        categoryDto = {
          id: cat.uuid || String(cat.id),
          name: cat.name,
        };
      }
    }

    let imgUrl: string | null = product.images[0]?.image_url ?? null;
    if (!imgUrl && product.variants.length > 0) {
      imgUrl = product.variants[0].product_variant_images[0]?.image_url ?? null;
    }

    const productUuid = product.uuid || String(product.id);
    const variantsDto: CustomerVariantListItemDto[] = product.variants.map((v) =>
      toVariantListItemDto(v, productUuid, product.name, imgUrl)
    );

    const primaryVariant =
      product.variants.find((v) => v.is_default) ?? product.variants[0] ?? null;

    const productImages: CustomerProductImageDto[] = (product.images || []).map((img) => ({
      id: String(img.id),
      imageUrl: img.image_url,
      altText: img.altText ?? null,
      sortOrder: img.sortOrder ?? 0,
      isPrimary: Boolean(img.isPrimary),
    }));

    return {
      id: productUuid,
      name: product.name,
      description:
        primaryVariant?.description || primaryVariant?.short_description || null,
      brand: product.brand
        ? {
            id: product.brand.uuid || String(product.brand.id),
            name: product.brand.name,
          }
        : null,
      category: categoryDto,
      image: imgUrl,
      images: productImages,
      variants: variantsDto,
    };
  },

  async findRelatedProducts(
    productUuid: string,
    limit: number
  ): Promise<CustomerProductListItemDto[] | null> {
    const product = await db.product.findFirst({
      where: { uuid: productUuid, isActive: true, deleted_at: null },
      select: { id: true, categoryId: true, brandId: true },
    });

    if (!product) return null;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deleted_at: null,
      id: { not: product.id },
      OR: [
        ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
        ...(product.brandId ? [{ brandId: product.brandId }] : []),
      ],
    };

    // No category/brand to relate on - nothing to return.
    if (!where.OR || where.OR.length === 0) return [];

    const related = await db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        brand: { select: { id: true, uuid: true, name: true } },
        images: {
          where: { is_active: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
        variants: {
          where: { isActive: true, deleted_at: null },
          include: {
            product_variant_images: {
              where: { is_active: true },
              orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
              take: 1,
            },
            variant_unit_prices: unitPriceListArgs,
          },
        },
      },
    });

    const categoryIds = related
      .map((p) => p.categoryId)
      .filter((id): id is bigint => id !== null && id !== undefined);

    const categories = categoryIds.length
      ? await db.productCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, uuid: true, name: true },
        })
      : [];
    const catMap = new Map(categories.map((c) => [c.id.toString(), c]));

    return related.map((p) => {
      const allPrices = p.variants.flatMap((v) =>
        (v.variant_unit_prices || []).map((up) => Number(up.base_price))
      );
      const minP = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxP = allPrices.length > 0 ? Math.max(...allPrices) : 0;

      let imgUrl: string | null = p.images[0]?.image_url ?? null;
      if (!imgUrl && p.variants.length > 0) {
        imgUrl = p.variants[0].product_variant_images[0]?.image_url ?? null;
      }

      const primaryVariant = p.variants.find((v) => v.is_default) ?? p.variants[0] ?? null;
      const variantWithPrices =
        p.variants.find((v) => (v.variant_unit_prices || []).length > 0) ?? primaryVariant;

      const unitPrices = (variantWithPrices?.variant_unit_prices || []).map((up) => {
        const basePrice = Number(up.base_price);
        const measurement = formatVariantMeasurement(up.product_units, up.unit_value ?? 0);
        return {
          id: up.uuid,
          label: formatMeasurementLabel(measurement) || "Standard",
          basePrice,
          sellingPrice: computeSellingPrice(basePrice),
        };
      });

      const cat = p.categoryId ? catMap.get(p.categoryId.toString()) : undefined;

      return {
        id: p.uuid || String(p.id),
        name: p.name,
        description: primaryVariant?.short_description || primaryVariant?.description || null,
        brand: p.brand ? { id: p.brand.uuid || String(p.brand.id), name: p.brand.name } : null,
        category: cat ? { id: cat.uuid || String(cat.id), name: cat.name } : null,
        image: imgUrl,
        minPrice: minP,
        maxPrice: maxP,
        unitPrices,
      };
    });
  },

  // ----------------------------------------------------
  // VARIANT REPOSITORY METHODS
  // ----------------------------------------------------
  async findCustomerVariantsByProductUuid(
    productUuid: string,
    params: CustomerVariantListInput
  ) {
    const product = await db.product.findFirst({
      where: {
        uuid: productUuid,
        isActive: true,
        deleted_at: null,
      },
      select: {
        id: true,
        uuid: true,
        name: true,
        images: {
          where: { is_active: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
    });

    if (!product) return null;

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ProductVariantWhereInput = {
      productId: product.id,
      isActive: true,
      deleted_at: null,
    };

    if (params.search) {
      where.OR = [
        { variant_name: { contains: params.search } },
        { variant_unit_prices: { some: { sku: { contains: params.search } } } },
      ];
    }

    const minVariantP = params.minPrice ? Math.max(params.minPrice, 0.01) : 0.01;
    const maxVariantP = params.maxPrice ?? Number.MAX_SAFE_INTEGER;

    where.variant_unit_prices = {
      some: {
        deleted_at: null,
        isActive: true,
        base_price: { gte: minVariantP, lte: maxVariantP },
      },
    };

    // Price/sku sorting now lives on VariantUnitPrice (one-to-many), so we
    // fetch by createdAt/variantName at the DB level and, when price sorting
    // is requested, sort in-memory by each variant's default unit price.
    let orderBy: Prisma.ProductVariantOrderByWithRelationInput = { createdAt: "desc" };
    if (params.sortBy === "variantName") {
      orderBy = { variant_name: params.sortOrder ?? "asc" };
    } else if (params.sortBy === "createdAt") {
      orderBy = { createdAt: params.sortOrder ?? "desc" };
    }

    const isPriceSort = params.sortBy === "basePrice" || params.sortBy === "salePrice";

    const [variants, total] = await Promise.all([
      db.productVariant.findMany({
        where,
        orderBy,
        ...(isPriceSort ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        include: {
          product_variant_images: {
            where: { is_active: true },
            orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            take: 1,
          },
          variant_unit_prices: unitPriceListArgs,
        },
      }),
      db.productVariant.count({ where }),
    ]);

    const fallbackImg = product.images?.[0]?.image_url ?? null;
    let data: CustomerVariantListItemDto[] = variants.map((v) =>
      toVariantListItemDto(v, product.uuid || String(product.id), product.name, fallbackImg)
    );

    if (isPriceSort) {
      const isAsc = params.sortOrder !== "desc";
      data.sort((a, b) => (isAsc ? a.basePrice - b.basePrice : b.basePrice - a.basePrice));
      data = data.slice((page - 1) * pageSize, page * pageSize);
    }

    return {
      data,
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async findCustomerVariantByUuids(
    productUuid: string,
    variantUuid: string
  ): Promise<CustomerVariantDetailDto | null> {
    const variant = await db.productVariant.findFirst({
      where: {
        uuid: variantUuid,
        isActive: true,
        deleted_at: null,
        product: {
          uuid: productUuid,
          isActive: true,
          deleted_at: null,
        },
        variant_unit_prices: {
          some: {
            deleted_at: null,
            isActive: true,
            base_price: { gt: 0 },
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            uuid: true,
            name: true,
            images: {
              where: { is_active: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            },
          },
        },
        product_variant_images: {
          where: { is_active: true },
          orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
        },
        variant_unit_prices: unitPriceListArgs,
      },
    });

    if (!variant || !variant.product) return null;

    let images: CustomerVariantImageDto[] = variant.product_variant_images.map((img) => ({
      id: img.uuid || String(img.id),
      imageUrl: img.image_url,
      sortOrder: img.sort_order,
      isPrimary: Boolean(img.is_primary),
    }));

    const fallbackProductImg = variant.product.images?.[0]?.image_url ?? null;
    if (images.length === 0 && variant.product.images && variant.product.images.length > 0) {
      images = variant.product.images.map((img) => ({
        id: String(img.id),
        imageUrl: img.image_url,
        sortOrder: img.sortOrder,
        isPrimary: Boolean(img.isPrimary),
      }));
    }

    const listItem = toVariantListItemDto(
      variant,
      variant.product.uuid || String(variant.product.id),
      variant.product.name,
      fallbackProductImg
    );

    return {
      ...listItem,
      images,
    };
  },

  async findCustomerGlobalVariants(params: CustomerGlobalVariantListInput) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deleted_at: null,
      product: {
        isActive: true,
        deleted_at: null,
      },
    };

    // Filter by Product UUIDs or Slugs
    if (params.productIds && params.productIds.length > 0) {
      const matchingProducts = await db.product.findMany({
        where: {
          OR: [
            { uuid: { in: params.productIds } },
            { slug: { in: params.productIds } },
          ],
          isActive: true,
          deleted_at: null,
        },
        select: { id: true },
      });
      const pIds = matchingProducts.map((p) => p.id);
      where.productId = { in: pIds };
    }

    // Filter by Brand UUIDs
    if (params.brandIds && params.brandIds.length > 0) {
      const matchingBrands = await db.productBrand.findMany({
        where: { uuid: { in: params.brandIds }, isActive: true, deleted_at: null },
        select: { id: true },
      });
      const bIds = matchingBrands.map((b) => b.id);
      where.product = {
        ...(where.product as Prisma.ProductWhereInput),
        brandId: { in: bIds },
      };
    }

    // Filter by Category UUIDs
    if (params.categoryIds && params.categoryIds.length > 0) {
      const matchingCategories = await db.productCategory.findMany({
        where: { uuid: { in: params.categoryIds }, isActive: true, deleted_at: null },
        select: { id: true },
      });
      const cIds = matchingCategories.map((c) => c.id);
      where.product = {
        ...(where.product as Prisma.ProductWhereInput),
        categoryId: { in: cIds },
      };
    }

    // Search filter across variantName, SKU, and productName
    if (params.search) {
      where.OR = [
        { variant_name: { contains: params.search } },
        { variant_unit_prices: { some: { sku: { contains: params.search } } } },
        { product: { name: { contains: params.search } } },
      ];
    }

    // Price range filter - always require active unit price with base_price > 0
    const minP = params.minPrice ? Math.max(params.minPrice, 0.01) : 0.01;
    const maxP = params.maxPrice ?? Number.MAX_SAFE_INTEGER;

    const priceCondition: Prisma.ProductVariantWhereInput = {
      variant_unit_prices: {
        some: { deleted_at: null, isActive: true, base_price: { gte: minP, lte: maxP } },
      },
    };

    if (where.OR) {
      where.AND = [priceCondition];
    } else {
      Object.assign(where, priceCondition);
    }

    // Base facet where: before inStock and vegType filters are applied
    const baseFacetWhere: Prisma.ProductVariantWhereInput = { ...where };

    // Featured filter
    if (params.isFeatured !== undefined) {
      where.is_featured = params.isFeatured;
    }

    // In Stock / Out of Stock filter
    if (params.inStock !== undefined) {
      where.out_of_stock = !params.inStock;
    }

    // Dietary (veg / non_veg / vegan) filter
    if (params.vegType) {
      if (params.vegType === "non_veg" || params.vegType === "nonveg") {
        where.veg_type = "nonveg";
      } else if (params.vegType === "vegan") {
        where.veg_type = "vegan";
      } else if (params.vegType === "veg") {
        where.veg_type = { in: ["veg", "na"] };
      } else {
        where.veg_type = params.vegType as "veg" | "vegan" | "na";
      }
    }

    // Sorting
    let orderBy: Prisma.ProductVariantOrderByWithRelationInput = { createdAt: "desc" };
    if (params.sortBy === "variantName") {
      orderBy = { variant_name: params.sortOrder ?? "asc" };
    } else if (params.sortBy === "productName") {
      orderBy = { product: { name: params.sortOrder ?? "asc" } };
    } else if (params.sortBy === "createdAt") {
      orderBy = { createdAt: params.sortOrder ?? "desc" };
    }

    const isPriceSort = params.sortBy === "basePrice" || params.sortBy === "salePrice";

    const [
      variants,
      total,
      inStockCount,
      outOfStockCount,
      vegCount,
      nonVegCount,
      veganCount,
      featuredCount,
    ] = await Promise.all([
      db.productVariant.findMany({
        where,
        orderBy,
        ...(isPriceSort ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        include: {
          product: {
            select: {
              id: true,
              uuid: true,
              name: true,
              images: {
                where: { is_active: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
              },
            },
          },
          product_variant_images: {
            where: { is_active: true },
            orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            take: 1,
          },
          variant_unit_prices: unitPriceListArgs,
        },
      }),
      db.productVariant.count({ where }),
      db.productVariant.count({ where: { ...baseFacetWhere, out_of_stock: false } }),
      db.productVariant.count({ where: { ...baseFacetWhere, out_of_stock: true } }),
      db.productVariant.count({ where: { ...baseFacetWhere, veg_type: { in: ["veg", "na"] } } }),
      db.productVariant.count({ where: { ...baseFacetWhere, veg_type: "nonveg" } }),
      db.productVariant.count({ where: { ...baseFacetWhere, veg_type: "vegan" } }),
      db.productVariant.count({ where: { ...baseFacetWhere, is_featured: true } }),
    ]);

    let data: CustomerVariantListItemDto[] = variants.map((v) =>
      toVariantListItemDto(
        v,
        v.product ? v.product.uuid || String(v.product.id) : "",
        v.product ? v.product.name : "",
        v.product?.images?.[0]?.image_url ?? null
      )
    );

    if (isPriceSort) {
      const isAsc = params.sortOrder !== "desc";
      data.sort((a, b) => (isAsc ? a.basePrice - b.basePrice : b.basePrice - a.basePrice));
      data = data.slice((page - 1) * pageSize, page * pageSize);
    }

    return {
      data,
      meta: {
        page,
        limit: pageSize,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        facets: {
          inStockCount,
          outOfStockCount,
          vegCount,
          nonVegCount,
          veganCount,
          featuredCount,
        },
      },
    };
  },

  // ----------------------------------------------------
  // RELATED PRODUCTS (BY VARIANT)
  // ----------------------------------------------------

  /**
   * Related items for a single variant.
   *
   * Relatedness comes from the catalog tree already in the database: products
   * hang off `product_categories`, which is a self-referencing tree, so the
   * source product's category is either a subcategory (it has a parent) or a
   * top-level category. Candidates are ranked closest-first:
   *   0 - same subcategory/category as the source product
   *   1 - sibling subcategory under the same parent category
   *   2 - same brand only
   *
   * The source product is excluded entirely, which also guarantees the source
   * variant is never returned. One representative variant (the default one,
   * else the oldest active one) is emitted per product, so neither a product
   * nor a variant can appear twice.
   *
   * Ranking cannot be expressed as a Prisma `orderBy`, so candidates are first
   * read as id-only rows (cheap), ranked and paginated in memory, and only the
   * page's variants are then loaded with their images, prices and stock.
   */
  async findRelatedVariantsByVariantId(
    variantId: string,
    params: CustomerRelatedVariantsQueryInput
  ): Promise<{ data: CustomerRelatedVariantDto[]; meta: PaginationMeta } | null> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    // Storefront resources are addressed by UUID, but the legacy product
    // routes still expose numeric primary keys - accept whichever was given.
    const isNumericId = /^\d+$/.test(variantId);

    const sourceVariant = await db.productVariant.findFirst({
      where: {
        ...(isNumericId ? { id: BigInt(variantId) } : { uuid: variantId }),
        isActive: true,
        deleted_at: null,
        product: { isActive: true, deleted_at: null },
      },
      select: {
        id: true,
        product: { select: { id: true, categoryId: true, brandId: true } },
      },
    });

    if (!sourceVariant?.product) return null;

    const sourceProduct = sourceVariant.product;

    const emptyResult = {
      data: [] as CustomerRelatedVariantDto[],
      meta: { page, limit, pageSize: limit, total: 0, totalPages: 0 },
    };

    // Resolve the source category's siblings (same parent) so "related" widens
    // from the exact subcategory out to the rest of the parent category.
    let siblingCategoryIds: bigint[] = [];
    if (sourceProduct.categoryId !== null && sourceProduct.categoryId !== undefined) {
      const sourceCategory = await db.productCategory.findFirst({
        where: { id: sourceProduct.categoryId, isActive: true, deleted_at: null },
        select: { id: true, parentId: true },
      });

      if (sourceCategory?.parentId) {
        const siblings = await db.productCategory.findMany({
          where: {
            parentId: sourceCategory.parentId,
            isActive: true,
            deleted_at: null,
            id: { not: sourceCategory.id },
          },
          select: { id: true },
        });
        siblingCategoryIds = siblings.map((c) => c.id);
      }
    }

    const categoryIdsToMatch = [
      ...(sourceProduct.categoryId ? [sourceProduct.categoryId] : []),
      ...siblingCategoryIds,
    ];

    const relatedOr: Prisma.ProductWhereInput[] = [
      ...(categoryIdsToMatch.length ? [{ categoryId: { in: categoryIdsToMatch } }] : []),
      ...(sourceProduct.brandId ? [{ brandId: sourceProduct.brandId }] : []),
    ];

    // Nothing to relate on - the source product has neither category nor brand.
    if (relatedOr.length === 0) return emptyResult;

    const candidateWhere: Prisma.ProductVariantWhereInput = {
      isActive: true,
      deleted_at: null,
      product: {
        isActive: true,
        deleted_at: null,
        id: { not: sourceProduct.id },
        OR: relatedOr,
      },
      variant_unit_prices: {
        some: {
          deleted_at: null,
          isActive: true,
          base_price: { gt: 0 },
        },
      },
    };

    // Id-only pass: enough to rank and to collapse to one variant per product,
    // without pulling images/prices for rows that will not be on this page.
    const candidates = await db.productVariant.findMany({
      where: candidateWhere,
      orderBy: [{ is_default: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        productId: true,
        product: { select: { categoryId: true, brandId: true, createdAt: true } },
      },
    });

    if (candidates.length === 0) return emptyResult;

    type RankedProduct = {
      productId: bigint;
      variantId: bigint;
      rank: number;
      createdAt: Date;
    };

    // First hit per product wins - the orderBy above puts the default variant
    // first, so each product is represented by its default (or oldest) variant.
    const byProduct = new Map<string, RankedProduct>();
    const siblingIdSet = new Set(siblingCategoryIds.map((id) => id.toString()));

    for (const candidate of candidates) {
      const key = candidate.productId.toString();
      if (byProduct.has(key)) continue;

      const categoryId = candidate.product?.categoryId ?? null;
      let rank = 2;
      if (
        categoryId !== null &&
        sourceProduct.categoryId !== null &&
        categoryId === sourceProduct.categoryId
      ) {
        rank = 0;
      } else if (categoryId !== null && siblingIdSet.has(categoryId.toString())) {
        rank = 1;
      }

      byProduct.set(key, {
        productId: candidate.productId,
        variantId: candidate.id,
        rank,
        createdAt: candidate.product?.createdAt ?? new Date(0),
      });
    }

    const ranked = Array.from(byProduct.values()).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      // Newest product first within a rank, then id so page boundaries are
      // stable across requests.
      const byDate = b.createdAt.getTime() - a.createdAt.getTime();
      if (byDate !== 0) return byDate;
      return a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0;
    });

    const total = ranked.length;
    const totalPages = Math.ceil(total / limit);
    const pageSlice = ranked.slice((page - 1) * limit, page * limit);

    if (pageSlice.length === 0) {
      return { data: [], meta: { page, limit, pageSize: limit, total, totalPages } };
    }

    // Detail pass: only the variants on this page.
    const variants = await db.productVariant.findMany({
      where: { id: { in: pageSlice.map((r) => r.variantId) } },
      select: {
        id: true,
        uuid: true,
        variant_name: true,
        out_of_stock: true,
        product: {
          select: {
            id: true,
            uuid: true,
            name: true,
            categoryId: true,
            brand: { select: { id: true, uuid: true, name: true } },
            images: {
              where: { is_active: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
              select: { image_url: true },
            },
          },
        },
        product_variant_images: {
          where: { is_active: true },
          orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
          take: 1,
          select: { image_url: true },
        },
        variant_unit_prices: {
          where: { deleted_at: null, isActive: true },
          orderBy: [{ is_default: "desc" }, { createdAt: "asc" }],
          select: {
            uuid: true,
            sku: true,
            base_price: true,
            unit_value: true,
            is_default: true,
            product_units: {
              select: { id: true, uuid: true, name: true, code: true, type: true },
            },
            inventories: { select: { quantity_available: true, quantity_reserved: true } },
          },
        },
      },
    });

    // Categories for the page's products, loaded with their parents so each
    // row can report both `category` and `subcategory`.
    const pageCategoryIds = Array.from(
      new Map(
        variants
          .map((v) => v.product?.categoryId)
          .filter((id): id is bigint => id !== null && id !== undefined)
          .map((id) => [id.toString(), id] as const)
      ).values()
    );

    const pageCategories = pageCategoryIds.length
      ? await db.productCategory.findMany({
          where: { id: { in: pageCategoryIds } },
          select: {
            id: true,
            uuid: true,
            name: true,
            parent: { select: { id: true, uuid: true, name: true } },
          },
        })
      : [];
    const categoryMap = new Map(pageCategories.map((c) => [c.id.toString(), c]));
    const variantMap = new Map(variants.map((v) => [v.id.toString(), v]));

    const data: CustomerRelatedVariantDto[] = [];

    // Walk pageSlice (not `variants`) so the ranked order is preserved.
    for (const entry of pageSlice) {
      const variant = variantMap.get(entry.variantId.toString());
      if (!variant?.product) continue;

      const product = variant.product;
      const defaultUnitPrice = pickDefaultUnitPrice(variant.variant_unit_prices);
      const basePrice = defaultUnitPrice ? Number(defaultUnitPrice.base_price) : 0;
      const sellingPrice = computeSellingPrice(basePrice);

      // Stock is tracked per unit price row (inventories key off them), so a
      // variant is available when any of its pack sizes has unreserved stock.
      const stockQuantity = variant.variant_unit_prices.reduce((sum, up) => {
        const inventory = up.inventories;
        if (!inventory) return sum;
        return sum + Math.max(inventory.quantity_available - inventory.quantity_reserved, 0);
      }, 0);

      const categoryRow = product.categoryId
        ? categoryMap.get(product.categoryId.toString())
        : undefined;
      // A category with a parent IS the subcategory; its parent is the category.
      const parentCategory = categoryRow?.parent ?? null;

      data.push({
        productId: product.uuid || String(product.id),
        productName: product.name,
        variantId: variant.uuid || String(variant.id),
        variantName: variant.variant_name || "",
        measurement: formatVariantMeasurement(
          defaultUnitPrice?.product_units,
          defaultUnitPrice?.unit_value ?? 0
        ),
        sku: defaultUnitPrice?.sku ?? "",
        unitPriceId: defaultUnitPrice?.uuid ?? null,
        price: basePrice,
        offerPrice: sellingPrice < basePrice ? sellingPrice : null,
        image:
          variant.product_variant_images[0]?.image_url ?? product.images[0]?.image_url ?? null,
        category: parentCategory
          ? { id: parentCategory.uuid || String(parentCategory.id), name: parentCategory.name }
          : categoryRow
            ? { id: categoryRow.uuid || String(categoryRow.id), name: categoryRow.name }
            : null,
        subcategory:
          parentCategory && categoryRow
            ? { id: categoryRow.uuid || String(categoryRow.id), name: categoryRow.name }
            : null,
        brand: product.brand
          ? { id: product.brand.uuid || String(product.brand.id), name: product.brand.name }
          : null,
        inStock: !variant.out_of_stock && stockQuantity > 0,
        stockQuantity,
      });
    }

    return { data, meta: { page, limit, pageSize: limit, total, totalPages } };
  },

  // ----------------------------------------------------
  // GLOBAL SEARCH METHOD
  // ----------------------------------------------------
  async globalSearch(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      return {
        categories: [] as CustomerCategoryDto[],
        products: [] as CustomerProductListItemDto[],
        items: [] as CustomerVariantListItemDto[],
        total: 0,
      };
    }

    const [categories, products, variants] = await Promise.all([
      db.productCategory.findMany({
        where: {
          isActive: true,
          deleted_at: null,
          status: true,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 4,
        orderBy: { name: "asc" },
        include: {
          product_category_images: {
            where: { is_active: true },
            take: 1,
          },
        },
      }),

      db.product.findMany({
        where: {
          isActive: true,
          deleted_at: null,
          name: { contains: q },
        },
        take: 4,
        orderBy: { name: "asc" },
        include: {
          brand: { select: { id: true, uuid: true, name: true } },
          images: {
            where: { is_active: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
          variants: {
            where: {
              isActive: true,
              deleted_at: null,
              variant_unit_prices: {
                some: {
                  deleted_at: null,
                  isActive: true,
                  base_price: { gt: 0 },
                },
              },
            },
            include: {
              product_variant_images: {
                where: { is_active: true },
                orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
                take: 1,
              },
              variant_unit_prices: unitPriceListArgs,
            },
          },
        },
      }),

      db.productVariant.findMany({
        where: {
          isActive: true,
          deleted_at: null,
          product: {
            isActive: true,
            deleted_at: null,
          },
          OR: [
            { variant_name: { contains: q } },
            { variant_unit_prices: { some: { sku: { contains: q }, isActive: true, deleted_at: null } } },
            { product: { name: { contains: q } } },
            { ingredients: { contains: q } },
          ],
        },
        take: 6,
        include: {
          product: {
            select: {
              id: true,
              uuid: true,
              name: true,
              images: {
                where: { is_active: true },
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
              },
            },
          },
          product_variant_images: {
            where: { is_active: true },
            orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            take: 1,
          },
          variant_unit_prices: unitPriceListArgs,
        },
      }),
    ]);

    const productCategoryIds = products
      .map((p) => p.categoryId)
      .filter((id): id is bigint => id !== null && id !== undefined);

    const productCategories =
      productCategoryIds.length > 0
        ? await db.productCategory.findMany({
            where: { id: { in: productCategoryIds }, isActive: true, deleted_at: null },
            select: { id: true, uuid: true, name: true },
          })
        : [];

    const categoryByIdMap = new Map<string, { id: string; name: string }>();
    productCategories.forEach((cat) => {
      categoryByIdMap.set(cat.id.toString(), {
        id: cat.uuid || String(cat.id),
        name: cat.name,
      });
    });

    const mappedCategories: CustomerCategoryDto[] = categories.map((c) => ({
      id: c.uuid || String(c.id),
      name: c.name,
      image: c.icon || c.product_category_images[0]?.image_url || null,
    }));

    const mappedProducts: CustomerProductListItemDto[] = products.map((p) => {
      const allPrices = p.variants.flatMap((v) =>
        (v.variant_unit_prices || []).map((up) => Number(up.base_price))
      );

      const minP = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxP = allPrices.length > 0 ? Math.max(...allPrices) : 0;

      let imgUrl: string | null = p.images[0]?.image_url ?? null;
      if (!imgUrl && p.variants.length > 0) {
        imgUrl = p.variants[0].product_variant_images[0]?.image_url ?? null;
      }

      const primaryVariant =
        p.variants.find((v) => v.is_default) ?? p.variants[0] ?? null;

      const variantWithPrices =
        p.variants.find((v) => (v.variant_unit_prices || []).length > 0) ?? primaryVariant;

      const unitPrices = (variantWithPrices?.variant_unit_prices || []).map((up) => {
        const basePrice = Number(up.base_price);
        const measurement = formatVariantMeasurement(up.product_units, up.unit_value ?? 0);
        return {
          id: up.uuid,
          label: formatMeasurementLabel(measurement) || "Standard",
          basePrice,
          sellingPrice: computeSellingPrice(basePrice),
        };
      });

      const cat = p.categoryId ? categoryByIdMap.get(p.categoryId.toString()) ?? null : null;

      return {
        id: p.uuid || String(p.id),
        name: p.name,
        description:
          primaryVariant?.short_description || primaryVariant?.description || null,
        brand: p.brand
          ? {
              id: p.brand.uuid || String(p.brand.id),
              name: p.brand.name,
            }
          : null,
        category: cat,
        image: imgUrl,
        minPrice: minP,
        maxPrice: maxP,
        unitPrices,
      };
    });

    const mappedItems: CustomerVariantListItemDto[] = variants.map((v) =>
      toVariantListItemDto(
        v,
        v.product ? v.product.uuid || String(v.product.id) : "",
        v.product ? v.product.name : "",
        v.product?.images?.[0]?.image_url ?? null
      )
    );

    const total = mappedCategories.length + mappedProducts.length + mappedItems.length;

    return {
      categories: mappedCategories,
      products: mappedProducts,
      items: mappedItems,
      total,
    };
  },

  async trackSearchVisit(params: CustomerTrackSearchInput): Promise<void> {
    const cleanKeyword = params.keyword.trim();
    if (!cleanKeyword) return;
    try {
      await db.search_history.create({
        data: {
          keyword: cleanKeyword,
          session_id: `${params.type || "search"}:${params.entityId || ""}`,
          results_count: params.resultsCount ?? 1,
          is_active: true,
        },
      });
    } catch (err) {
      console.error("Failed to record search visit:", err);
    }
  },

  async getPopularSearchesAndCategories(limit: number = 10): Promise<CustomerPopularSearchResponse> {
    // 1. Fetch top product / search keywords from search_history
    const topKeywordsRaw = await db.$queryRaw<Array<{ keyword: string; count: bigint }>>`
      SELECT keyword, COUNT(*) as count
      FROM search_history
      WHERE is_active = 1
        AND (session_id IS NULL OR session_id LIKE 'product:%' OR session_id LIKE 'variant:%' OR session_id = 'search' OR session_id = '')
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const popularSearches = topKeywordsRaw.map((row) => ({
      keyword: row.keyword,
      count: Number(row.count),
    }));

    // If no data or fewer than 8-10, backfill with newly added products
    if (popularSearches.length < limit) {
      const existingKeywords = new Set(popularSearches.map((s) => s.keyword.toLowerCase()));
      const remaining = limit - popularSearches.length;

      const recentProducts = await db.product.findMany({
        where: { isActive: true, deleted_at: null },
        orderBy: { createdAt: "desc" },
        take: remaining * 2,
        select: { name: true },
      });

      for (const prod of recentProducts) {
        if (!existingKeywords.has(prod.name.toLowerCase())) {
          popularSearches.push({ keyword: prod.name, count: 0 });
          existingKeywords.add(prod.name.toLowerCase());
          if (popularSearches.length >= limit) break;
        }
      }
    }

    // 2. Fetch top categories from search_history
    const topCategoriesRaw = await db.$queryRaw<Array<{ keyword: string; session_id: string; count: bigint }>>`
      SELECT keyword, session_id, COUNT(*) as count
      FROM search_history
      WHERE is_active = 1 AND session_id LIKE 'category:%'
      GROUP BY keyword, session_id
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const popularCategories: CustomerPopularSearchResponse["popularCategories"] = [];
    const addedCatIds = new Set<string>();

    for (const row of topCategoriesRaw) {
      const catUuid = row.session_id.replace(/^category:/, "").trim();
      const cat = await db.productCategory.findFirst({
        where: {
          OR: [
            ...(catUuid ? [{ uuid: catUuid }] : []),
            { name: row.keyword },
          ],
          isActive: true,
          deleted_at: null,
        },
        include: {
          product_category_images: {
            where: { is_active: true },
            take: 1,
          },
        },
      });

      if (cat && !addedCatIds.has(cat.uuid || String(cat.id))) {
        const catId = cat.uuid || String(cat.id);
        addedCatIds.add(catId);
        popularCategories.push({
          id: catId,
          name: cat.name,
          image: cat.icon || cat.product_category_images[0]?.image_url || null,
          count: Number(row.count),
        });
      }
    }

    // If no data or fewer than 8-10, backfill with newly added categories
    if (popularCategories.length < limit) {
      const remaining = limit - popularCategories.length;
      const recentCategories = await db.productCategory.findMany({
        where: {
          isActive: true,
          deleted_at: null,
          status: true,
          ...(addedCatIds.size > 0
            ? { uuid: { notIn: Array.from(addedCatIds) } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: remaining,
        include: {
          product_category_images: {
            where: { is_active: true },
            take: 1,
          },
        },
      });

      for (const cat of recentCategories) {
        const catId = cat.uuid || String(cat.id);
        if (!addedCatIds.has(catId)) {
          addedCatIds.add(catId);
          popularCategories.push({
            id: catId,
            name: cat.name,
            image: cat.icon || cat.product_category_images[0]?.image_url || null,
            count: 0,
          });
        }
      }
    }

    return {
      popularSearches,
      popularCategories,
    };
  },
};
