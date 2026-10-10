import { apiClient } from "@/lib/api/api-client";
import type {
  CustomerBrandDto,
  CustomerCategoryDto,
  CustomerProductListItemDto,
  CustomerProductDetailDto,
  CustomerVariantListItemDto,
  CustomerVariantDetailDto,
  CustomerPopularSearchResponse,
  CustomerTrackSearchInput,
} from "../types/catalog.types";
import type {
  CustomerBrandListInput,
  CustomerCategoryListInput,
  CustomerProductListInput,
  CustomerVariantListInput,
  CustomerGlobalVariantListInput,
} from "../validations/catalog.schema";
import type { ApiResponse } from "@/lib/api/api-response";

export interface CatalogFacets {
  inStockCount: number;
  outOfStockCount: number;
  vegCount: number;
  nonVegCount: number;
  veganCount?: number;
  featuredCount?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  pageSize?: number;
  total: number;
  totalPages: number;
  facets?: CatalogFacets;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface CustomerGlobalSearchResult {
  products: CustomerProductListItemDto[];
  categories: CustomerCategoryDto[];
  items: CustomerVariantListItemDto[];
  total: number;
}

export const customerCatalogApi = {
  /**
   * Fetch customer brand list
   * Postman: POST /api/customer/brands
   */
  async getBrands(
    params?: CustomerBrandListInput
  ): Promise<PaginatedResponse<CustomerBrandDto>> {
    const response = await apiClient.post<CustomerBrandDto[]>(
      "/api/customer/brands",
      params || {}
    );
    return {
      data: response.data ?? [],
      meta: response.meta as PaginationMeta | undefined,
    };
  },

  /**
   * Fetch single brand by UUID
   * Postman: GET /api/customer/brands/:uuid
   */
  async getBrand(uuid: string): Promise<CustomerBrandDto> {
    const response = await apiClient.get<CustomerBrandDto>(
      `/api/customer/brands/${uuid}`
    );
    return response.data!;
  },

  /**
   * Fetch customer categories list
   * Postman: POST /api/customer/categories
   */
  async getCategories(
    params?: CustomerCategoryListInput
  ): Promise<PaginatedResponse<CustomerCategoryDto>> {
    const response = await apiClient.post<CustomerCategoryDto[]>(
      "/api/customer/categories",
      params || {}
    );
    return {
      data: response.data ?? [],
      meta: response.meta as PaginationMeta | undefined,
    };
  },

  /**
   * Fetch single category by UUID
   * Postman: GET /api/customer/categories/:uuid
   */
  async getCategory(uuid: string): Promise<CustomerCategoryDto> {
    const response = await apiClient.get<CustomerCategoryDto>(
      `/api/customer/categories/${uuid}`
    );
    return response.data!;
  },

  /**
   * Fetch customer products list with filters (brands, categories, min/max price, search, sorting)
   * Postman: POST /api/customer/products
   */
  async getProducts(
    params?: CustomerProductListInput
  ): Promise<PaginatedResponse<CustomerProductListItemDto>> {
    const response = await apiClient.post<CustomerProductListItemDto[]>(
      "/api/customer/products",
      params || {}
    );
    return {
      data: response.data ?? [],
      meta: response.meta as PaginationMeta | undefined,
    };
  },

  /**
   * Fetch customer product detail by product UUID
   * Postman: GET /api/customer/products/:productUuid
   */
  async getProduct(productUuid: string): Promise<CustomerProductDetailDto> {
    const response = await apiClient.get<CustomerProductDetailDto>(
      `/api/customer/products/${productUuid}`
    );
    return response.data!;
  },

  /**
   * Fetch related products for a given product (same category/brand)
   * Postman: GET /api/customer/products/:productUuid/related
   */
  async getRelatedProducts(
    productUuid: string,
    limit?: number
  ): Promise<CustomerProductListItemDto[]> {
    const response = await apiClient.get<CustomerProductListItemDto[]>(
      `/api/customer/products/${productUuid}/related${limit ? `?limit=${limit}` : ""}`
    );
    return response.data ?? [];
  },

  /**
   * Fetch variants of a specific product with min/max price filter
   * Postman: POST /api/customer/products/:productUuid/variants
   */
  async getProductVariants(
    productUuid: string,
    params?: CustomerVariantListInput
  ): Promise<PaginatedResponse<CustomerVariantListItemDto>> {
    const response = await apiClient.post<CustomerVariantListItemDto[]>(
      `/api/customer/products/${productUuid}/variants`,
      params || {}
    );
    return {
      data: response.data ?? [],
      meta: response.meta as PaginationMeta | undefined,
    };
  },

  /**
   * Fetch single variant details
   * Postman: GET /api/customer/products/:productUuid/variants/:variantUuid
   */
  async getVariant(
    productUuid: string,
    variantUuid: string
  ): Promise<CustomerVariantDetailDto> {
    const response = await apiClient.get<CustomerVariantDetailDto>(
      `/api/customer/products/${productUuid}/variants/${variantUuid}`
    );
    return response.data!;
  },

  /**
   * Fetch all variants global catalog filter
   * Postman: POST /api/customer/variants
   */
  async getAllVariants(
    params?: CustomerGlobalVariantListInput
  ): Promise<PaginatedResponse<CustomerVariantListItemDto>> {
    const response = await apiClient.post<CustomerVariantListItemDto[]>(
      "/api/customer/variants",
      params || {}
    );
    return {
      data: response.data ?? [],
      meta: response.meta as PaginationMeta | undefined,
    };
  },

  /**
   * Fetch promotional banners
   * Postman: GET /api/customer/banners
   */
  async getBanners(position?: string) {
    const response = await apiClient.get<any[]>(
      `/api/customer/banners${position ? `?position=${position}` : ""}`
    );
    return response.data ?? [];
  },

  /**
   * Global customer search across categories, products, and variants
   * Postman: GET /api/customer/search?q=...
   */
  async searchCatalog(
    query: string,
    signal?: AbortSignal
  ): Promise<CustomerGlobalSearchResult> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { products: [], categories: [], items: [], total: 0 };
    }
    const response = await apiClient.get<CustomerGlobalSearchResult>(
      `/api/customer/search?q=${encodeURIComponent(trimmed)}`,
      { signal }
    );
    return (
      response.data ?? {
        products: [],
        categories: [],
        items: [],
        total: 0,
      }
    );
  },

  /**
   * Fetch popular searches and popular categories (or newly added fallbacks)
   * Postman: GET /api/customer/search/popular
   */
  async getPopularSearches(limit?: number): Promise<CustomerPopularSearchResponse> {
    const response = await apiClient.get<CustomerPopularSearchResponse>(
      `/api/customer/search/popular${limit ? `?limit=${limit}` : ""}`
    );
    return (
      response.data ?? {
        popularSearches: [],
        popularCategories: [],
      }
    );
  },

  /**
   * Track search keyword or product/variant/category click from search
   * Postman: POST /api/customer/search/track
   */
  async trackSearchVisit(payload: CustomerTrackSearchInput): Promise<void> {
    try {
      await apiClient.post("/api/customer/search/track", payload);
    } catch {
      // Non-blocking telemetry
    }
  },
};
