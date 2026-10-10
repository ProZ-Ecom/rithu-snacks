import { apiClient } from "@/lib/api/api-client";
import type {
  AdminVariantResponse,
  AdminVariantImageResponse,
  GetAdminVariantsResult,
  CustomerVariantListItemDto,
  CustomerGlobalVariantListParams,
  GetAdminVariantsParams,
  AdminVariantListParams,
  VariantPriceHistoryResponse,
  GetVariantPriceHistoryParams,
  PriceHistoryChartItem,
  BulkEditVariantsInput,
  VariantUnitPriceResponse,
  CreateVariantUnitPriceInput,
  UpdateVariantUnitPriceInput,
} from "../types";

export async function getCustomerVariants(
  params?: CustomerGlobalVariantListParams
) {
  const body: Record<string, unknown> = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    sortBy: params?.sortBy ?? "createdAt",
    sortOrder: params?.sortOrder ?? "desc",
  };

  if (params?.search && params.search.trim()) {
    body.search = params.search.trim();
  }
  if (params?.categoryIds && params.categoryIds.length > 0) {
    body.categoryIds = params.categoryIds;
  }
  if (params?.brandIds && params.brandIds.length > 0) {
    body.brandIds = params.brandIds;
  }
  if (params?.productIds && params.productIds.length > 0) {
    body.productIds = params.productIds;
  }
  if (params?.minPrice !== undefined && params?.minPrice !== null) {
    body.minPrice = params.minPrice;
  }
  if (params?.maxPrice !== undefined && params?.maxPrice !== null) {
    body.maxPrice = params.maxPrice;
  }
  if (params?.isFeatured !== undefined) {
    body.isFeatured = params.isFeatured;
  }
  if (params?.inStock !== undefined) {
    body.inStock = params.inStock;
  }
  if (params?.vegType !== undefined) {
    body.vegType = params.vegType;
  }

  const response = await apiClient.post<CustomerVariantListItemDto[]>(
    "/api/customer/variants",
    body
  );

  return response;
}

export async function getAdminVariants(
  params?: AdminVariantListParams
): Promise<GetAdminVariantsResult> {
  const body: Record<string, unknown> = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    sortBy: params?.sortBy ?? "createdAt",
    sortOrder: params?.sortOrder ?? "desc",
  };

  if (params?.search && params.search.trim()) {
    body.search = params.search.trim();
  }

  const rawProductIds =
    params?.productIds ??
    ((params as any)?.productId ? [String((params as any).productId)] : undefined);
  if (rawProductIds && rawProductIds.length > 0) {
    body.productIds = rawProductIds.filter(Boolean);
  }

  if (params?.brandIds && params.brandIds.length > 0) {
    body.brandIds = params.brandIds.filter(Boolean);
  }

  if (params?.categoryIds && params.categoryIds.length > 0) {
    body.categoryIds = params.categoryIds.filter(Boolean);
  }

  if (params?.measurementTypes && params.measurementTypes.length > 0) {
    body.measurementTypes = params.measurementTypes;
  }

  if (params?.unitIds && params.unitIds.length > 0) {
    body.unitIds = params.unitIds.filter(Boolean);
  }

  if (params?.isActive !== undefined) {
    body.isActive = params.isActive;
  }

  if (typeof params?.minPrice === "number" && params.minPrice >= 0) {
    body.minPrice = params.minPrice;
  }

  if (typeof params?.maxPrice === "number" && params.maxPrice >= 0) {
    body.maxPrice = params.maxPrice;
  }

  const response = await apiClient.post<AdminVariantResponse[]>(
    "/api/admin/variants",
    body
  );

  return {
    data: response.data ?? [],
    meta: response.meta,
  };
}

export async function getAdminProductVariants(
  productUuid: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<GetAdminVariantsResult> {
  const response = await apiClient.get<AdminVariantResponse[]>(
    `/api/admin/products/${productUuid}/variants`,
    { params }
  );

  return {
    data: response.data ?? [],
    meta: response.meta,
  };
}

export async function getAdminVariant(
  productUuid: string,
  variantUuid: string
) {
  return apiClient.get<AdminVariantResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}`
  );
}

export async function createAdminVariant(
  productUuid: string,
  data: Record<string, unknown>
) {
  return apiClient.post<AdminVariantResponse>(
    `/api/admin/products/${productUuid}/variants`,
    data
  );
}

export async function updateAdminVariant(
  productUuid: string,
  variantUuid: string,
  data: Record<string, unknown>
) {
  return apiClient.put<AdminVariantResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}`,
    data
  );
}

export async function deleteAdminVariant(
  productUuid: string,
  variantUuid: string
) {
  return apiClient.delete(
    `/api/admin/products/${productUuid}/variants/${variantUuid}`
  );
}

export async function bulkDeleteAdminVariants(ids: string[]) {
  return apiClient.post<{ count: number; message: string }>(
    "/api/admin/variants/bulk-delete",
    { ids }
  );
}


// Variant Images API
export async function getAdminVariantImages(
  productUuid: string,
  variantUuid: string
): Promise<AdminVariantImageResponse[]> {
  const response = await apiClient.get<AdminVariantImageResponse[]>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/images`
  );
  return response.data ?? [];
}

export async function createAdminVariantImages(
  productUuid: string,
  variantUuid: string,
  images: Array<{
    imageUrl: string;
    sortOrder?: number;
    isPrimary?: boolean;
  }>
): Promise<AdminVariantImageResponse[]> {
  const response = await apiClient.post<AdminVariantImageResponse[]>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/images`,
    images
  );
  return response.data ?? [];
}

export async function updateAdminVariantImage(
  productUuid: string,
  variantUuid: string,
  imageUuid: string,
  data: { imageUrl?: string; sortOrder?: number }
) {
  return apiClient.put<AdminVariantImageResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/images/${imageUuid}`,
    data
  );
}

export async function setPrimaryAdminVariantImage(
  productUuid: string,
  variantUuid: string,
  imageUuid: string
) {
  return apiClient.put<AdminVariantImageResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/images/${imageUuid}/primary`
  );
}

export async function deleteAdminVariantImage(
  productUuid: string,
  variantUuid: string,
  imageUuid: string
) {
  return apiClient.delete(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/images/${imageUuid}`
  );
}

// Multipart File Upload Helpers
export async function uploadVariantImageFile(
  file: File,
  folder: string = "variants"
): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append("folder", folder);
  formData.append("file", file);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to upload image");
  }

  return result.data;
}

export async function uploadVariantImageFiles(
  files: File[],
  folder: string = "variants"
): Promise<{ paths: string[] }> {
  const formData = new FormData();
  formData.append("folder", folder);
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to upload images");
  }

  return result.data;
}

// Price History API
export async function getVariantPriceHistory(
  variantUuid: string,
  params?: GetVariantPriceHistoryParams
) {
  const queryParams: Record<string, string | number | undefined> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.pageSize) queryParams.pageSize = params.pageSize;
  if (params?.fromDate) queryParams.fromDate = params.fromDate;
  if (params?.toDate) queryParams.toDate = params.toDate;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  const response = await apiClient.get<VariantPriceHistoryResponse[]>(
    `/api/admin/variants/${variantUuid}/price-history`,
    { params: queryParams }
  );

  return {
    data: response.data ?? [],
    meta: response.meta,
  };
}

export async function getVariantPriceHistoryChart(
  variantUuid: string,
  period: string = "1y"
): Promise<PriceHistoryChartItem[]> {
  const response = await apiClient.get<PriceHistoryChartItem[]>(
    `/api/admin/variants/${variantUuid}/price-history/chart`,
    { params: { period } }
  );
  return response.data ?? [];
}

// Bulk Edit Variants API
export async function bulkEditVariants(
  data: BulkEditVariantsInput
): Promise<AdminVariantResponse[]> {
  const response = await apiClient.put<AdminVariantResponse[]>(
    "/api/admin/variants/bulk",
    data
  );
  return response.data ?? [];
}

// Variant Unit Prices API (unit + price combinations for an item)
export async function getVariantUnitPrices(
  productUuid: string,
  variantUuid: string
): Promise<VariantUnitPriceResponse[]> {
  const response = await apiClient.get<VariantUnitPriceResponse[]>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/unit-prices`
  );
  return response.data ?? [];
}

export async function createVariantUnitPrice(
  productUuid: string,
  variantUuid: string,
  data: CreateVariantUnitPriceInput
) {
  return apiClient.post<VariantUnitPriceResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/unit-prices`,
    data
  );
}

export async function updateVariantUnitPrice(
  productUuid: string,
  variantUuid: string,
  unitPriceUuid: string,
  data: UpdateVariantUnitPriceInput
) {
  return apiClient.put<VariantUnitPriceResponse>(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/unit-prices/${unitPriceUuid}`,
    data
  );
}

export async function deleteVariantUnitPrice(
  productUuid: string,
  variantUuid: string,
  unitPriceUuid: string
) {
  return apiClient.delete(
    `/api/admin/products/${productUuid}/variants/${variantUuid}/unit-prices/${unitPriceUuid}`
  );
}

// Aliases
export const getVariants = getAdminVariants;
export const getVariant = getAdminVariant;
export const createVariant = createAdminVariant;
export const updateVariant = updateAdminVariant;
export const deleteVariant = deleteAdminVariant;
