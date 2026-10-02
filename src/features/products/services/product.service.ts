import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { ApiError } from "@/lib/api/api-error";
import { productRepository } from "../repositories/product.repository";
import { categoryRepository } from "@/features/categories/repositories/category.repository";
import { brandRepository } from "@/features/brands/repositories/brand.repository";
import { hsnCodeRepository } from "@/features/hsn-codes/repositories/hsn-code.repository";
import { userRepository } from "@/features/users/repositories/user.repository";
import type { Prisma } from "@/generated/prisma";
import type {
  AdminProductResponse,
  GetAdminProductsParams,
  AdminProductsCountResponse,
} from "../types";
import type {
  CreateAdminProductInput,
  UpdateAdminProductInput,
  AdminProductListInput,
} from "../validations/admin-product.schema";

async function formatAdminProductResponse(
  product: {
    id: bigint;
    uuid: string | null;
    categoryId: bigint | null;
    brandId: bigint | null;
    hsn_code_id: bigint | null;
    name: string;
    slug: string;
    status: boolean | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    brand?: { id: bigint; uuid: string | null; name: string; isActive: boolean } | null;
    product_hsn_codes?: { id: bigint; uuid: string | null; code: string; description: string | null; is_active: boolean } | null;
    images?: Array<{ id: bigint; image_url: string; isPrimary: boolean; sortOrder: number }> | null;
  },
  cachedCategory?: { uuid: string | null; name: string | null } | null
): Promise<AdminProductResponse> {
  const productUuid = product.uuid || String(product.id);
  
  let categoryUuid: string | null = null;
  let categoryName: string | null = null;
  if (cachedCategory !== undefined && cachedCategory !== null) {
    categoryUuid = cachedCategory.uuid ?? null;
    categoryName = cachedCategory.name ?? null;
  } else if (product.categoryId) {
    const category = await categoryRepository.findById(product.categoryId);
    categoryUuid = category?.uuid ?? null;
    categoryName = category?.name ?? null;
  }

  const brandUuid = product.brand?.uuid ?? null;
  const brandName = product.brand?.name ?? null;

  const hsnUuid = product.product_hsn_codes?.uuid ?? null;
  const hsnCodeName =
    product.product_hsn_codes?.code ||
    null;

  const primaryImg =
    product.images?.find((img) => img.isPrimary)?.image_url ??
    product.images?.[0]?.image_url ??
    null;

  return {
    id: productUuid,
    categoryId: categoryUuid,
    categoryName,
    brandId: brandUuid,
    brandName,
    hsnCodeId: hsnUuid,
    hsnCodeName,
    name: product.name,
    slug: product.slug,
    imageUrl: primaryImg,
    status: Boolean(product.status),
    isActive: Boolean(product.isActive),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function formatAdminProductList(products: any[]): Promise<AdminProductResponse[]> {
  const categoryIds = Array.from(
    new Set(
      products
        .map((p) => p.categoryId)
        .filter((id): id is bigint => id !== null && id !== undefined)
    )
  );

  const categories = categoryIds.length > 0
    ? await db.productCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, uuid: true, name: true },
      })
    : [];

  const categoryMap = new Map<string, { uuid: string | null; name: string | null }>();
  categories.forEach((cat) => {
    categoryMap.set(String(cat.id), { uuid: cat.uuid, name: cat.name });
  });

  return Promise.all(
    products.map((item) => {
      const cached = item.categoryId ? categoryMap.get(String(item.categoryId)) : null;
      return formatAdminProductResponse(item, cached);
    })
  );
}

async function getAdminInternalId(email?: string): Promise<bigint | null> {
  if (!email) return null;
  const user = await userRepository.findByEmail(email);
  if (!user) return null;
  return BigInt(user.internalId || user.id);
}

export const productService = {
  async createAdminProduct(
    data: CreateAdminProductInput,
    adminEmail?: string
  ): Promise<AdminProductResponse> {
    const adminId = await getAdminInternalId(adminEmail);

    // 1. Resolve & Validate Category UUID
    const category = await categoryRepository.findByUuid(data.categoryId);
    if (!category || !category.isActive) {
      throw ApiError.badRequest("Invalid or inactive category");
    }

    // 2. Resolve & Validate Brand UUID
    const brand = await brandRepository.findByUuid(data.brandId);
    if (!brand || !brand.isActive) {
      throw ApiError.badRequest("Invalid or inactive brand");
    }

    // 3. Resolve & Validate HSN Code UUID (optional)
    let resolvedHsnCodeId: bigint | null = null;
    if (data.hsnCodeId) {
      const hsnCode = await hsnCodeRepository.findByUuid(data.hsnCodeId);
      if (!hsnCode || !hsnCode.is_active) {
        throw ApiError.badRequest("Invalid or inactive HSN code");
      }
      resolvedHsnCodeId = hsnCode.id;
    }

    // 4. Check duplicate slug
    const existingSlug = await productRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw ApiError.conflict(`An active product with slug '${data.slug}' already exists`);
    }

    // 5. Check duplicate name
    const existingName = await productRepository.findByName(data.name);
    if (existingName) {
      throw ApiError.conflict(`An active product with name '${data.name}' already exists`);
    }

    const created = await productRepository.create({
      uuid: crypto.randomUUID(),
      categoryId: category.id,
      brandId: brand.id,
      hsn_code_id: resolvedHsnCodeId,
      name: data.name,
      slug: data.slug, // Frontend-supplied slug preserved without modification
      status: true, // Static reserved field - always true
      isActive: true, // Active status
      created_by: adminId,
      updated_by: adminId,
    });

    const imgUrl = data.productImage || data.imageUrl;
    let images: Array<{ id: bigint; image_url: string; isPrimary: boolean; sortOrder: number }> = [];
    if (imgUrl) {
      const createdImg = await db.productImage.create({
        data: {
          productId: created.id,
          image_url: imgUrl,
          isPrimary: true,
          sortOrder: 0,
          is_active: true,
          created_by: adminId,
          updated_by: adminId,
        },
      });
      images = [createdImg];
    }

    return formatAdminProductResponse({ ...created, images }, { uuid: category.uuid, name: category.name });
  },

  async getAdminProducts(params: GetAdminProductsParams = {}) {
    const result = await productRepository.findAdminAll(params);
    const data = await formatAdminProductList(result.data);

    return {
      data,
      meta: result.meta,
    };
  },

  async getAdminProductsList(params: AdminProductListInput) {
    let resolvedCategoryInternalId: bigint | undefined = undefined;
    let resolvedBrandInternalId: bigint | undefined = undefined;
    let resolvedHsnCodeInternalId: bigint | undefined = undefined;

    if (params.categoryId) {
      const category = await categoryRepository.findByUuid(params.categoryId);
      if (!category) {
        return {
          data: [],
          meta: {
            page: params.page ?? 1,
            limit: params.limit ?? params.pageSize ?? 10,
            pageSize: params.limit ?? params.pageSize ?? 10,
            total: 0,
            totalPages: 1,
          },
        };
      }
      resolvedCategoryInternalId = category.id;
    }

    if (params.brandId) {
      const brand = await brandRepository.findByUuid(params.brandId);
      if (!brand) {
        return {
          data: [],
          meta: {
            page: params.page ?? 1,
            limit: params.limit ?? params.pageSize ?? 10,
            pageSize: params.limit ?? params.pageSize ?? 10,
            total: 0,
            totalPages: 1,
          },
        };
      }
      resolvedBrandInternalId = brand.id;
    }

    if (params.hsnCodeId) {
      const hsnCode = await hsnCodeRepository.findByUuid(params.hsnCodeId);
      if (!hsnCode) {
        return {
          data: [],
          meta: {
            page: params.page ?? 1,
            limit: params.limit ?? params.pageSize ?? 10,
            pageSize: params.limit ?? params.pageSize ?? 10,
            total: 0,
            totalPages: 1,
          },
        };
      }
      resolvedHsnCodeInternalId = hsnCode.id;
    }

    const result = await productRepository.findAdminList(
      params,
      resolvedCategoryInternalId,
      resolvedBrandInternalId,
      resolvedHsnCodeInternalId
    );

    const data = await formatAdminProductList(result.data);

    return {
      data,
      meta: result.meta,
    };
  },

  async countAdminProducts(
    params: AdminProductListInput
  ): Promise<AdminProductsCountResponse> {
    let resolvedCategoryInternalId: bigint | undefined = undefined;
    let resolvedBrandInternalId: bigint | undefined = undefined;
    let resolvedHsnCodeInternalId: bigint | undefined = undefined;

    if (params.categoryId) {
      const category = await categoryRepository.findByUuid(params.categoryId);
      if (!category) {
        return {
          active: 0,
          inactive: 0,
          all: 0,
        };
      }
      resolvedCategoryInternalId = category.id;
    }

    if (params.brandId) {
      const brand = await brandRepository.findByUuid(params.brandId);
      if (!brand) {
        return {
          active: 0,
          inactive: 0,
          all: 0,
        };
      }
      resolvedBrandInternalId = brand.id;
    }

    if (params.hsnCodeId) {
      const hsnCode = await hsnCodeRepository.findByUuid(params.hsnCodeId);
      if (!hsnCode) {
        return {
          active: 0,
          inactive: 0,
          all: 0,
        };
      }
      resolvedHsnCodeInternalId = hsnCode.id;
    }

    return productRepository.countAdminList(
      params,
      resolvedCategoryInternalId,
      resolvedBrandInternalId,
      resolvedHsnCodeInternalId
    );
  },

  async getAdminProductByUuid(uuid: string): Promise<AdminProductResponse> {
    const product = await productRepository.findByUuid(uuid);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    return formatAdminProductResponse(product);
  },

  async updateAdminProduct(
    uuid: string,
    data: UpdateAdminProductInput,
    adminEmail?: string
  ): Promise<AdminProductResponse> {
    const existing = await productRepository.findByUuid(uuid);
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    const adminId = await getAdminInternalId(adminEmail);
    const updateData: Prisma.ProductUncheckedUpdateInput = {};
    let cachedCategory: { uuid: string | null; name: string | null } | undefined = undefined;

    if (adminId) {
      updateData.updated_by = adminId;
    }

    // Resolve Category UUID if provided
    if (data.categoryId !== undefined) {
      const category = await categoryRepository.findByUuid(data.categoryId);
      if (!category || !category.isActive) {
        throw ApiError.badRequest("Invalid or inactive category");
      }
      updateData.categoryId = category.id;
      cachedCategory = { uuid: category.uuid, name: category.name };
    }

    // Resolve Brand UUID if provided
    if (data.brandId !== undefined) {
      const brand = await brandRepository.findByUuid(data.brandId);
      if (!brand || !brand.isActive) {
        throw ApiError.badRequest("Invalid or inactive brand");
      }
      updateData.brandId = brand.id;
    }

    // Resolve HSN Code UUID if provided
    if (data.hsnCodeId !== undefined) {
      if (data.hsnCodeId === null) {
        updateData.hsn_code_id = null;
      } else {
        const hsnCode = await hsnCodeRepository.findByUuid(data.hsnCodeId);
        if (!hsnCode || !hsnCode.is_active) {
          throw ApiError.badRequest("Invalid or inactive HSN code");
        }
        updateData.hsn_code_id = hsnCode.id;
      }
    }

    // Check duplicate slug if slug changes
    if (data.slug !== undefined && data.slug !== existing.slug) {
      const slugConflict = await productRepository.findBySlug(data.slug, uuid);
      if (slugConflict) {
        throw ApiError.conflict(`An active product with slug '${data.slug}' already exists`);
      }
      updateData.slug = data.slug;
    }

    // Check duplicate name if name changes
    if (data.name !== undefined && data.name !== existing.name) {
      const nameConflict = await productRepository.findByName(data.name, uuid);
      if (nameConflict) {
        throw ApiError.conflict(`An active product with name '${data.name}' already exists`);
      }
      updateData.name = data.name;
    }

    const updated = await productRepository.updateByUuid(uuid, updateData);
    if (!updated) {
      throw ApiError.notFound("Product not found");
    }

    const imgUrl = data.productImage ?? data.imageUrl;
    if (imgUrl !== undefined) {
      if (imgUrl) {
        const existingImg = await db.productImage.findFirst({
          where: { productId: existing.id, is_active: true },
        });
        if (existingImg) {
          await db.productImage.update({
            where: { id: existingImg.id },
            data: { image_url: imgUrl, isPrimary: true, updated_by: adminId },
          });
        } else {
          await db.productImage.create({
            data: {
              productId: existing.id,
              image_url: imgUrl,
              isPrimary: true,
              sortOrder: 0,
              is_active: true,
              created_by: adminId,
              updated_by: adminId,
            },
          });
        }
      } else {
        // User cleared/deleted the product image
        await db.productImage.updateMany({
          where: { productId: existing.id, is_active: true },
          data: { is_active: false, isPrimary: false, updated_at: new Date(), ...(adminId ? { updated_by: adminId } : {}) },
        });
      }
    }

    // Refresh updated product with its images
    const refreshed = await productRepository.findByUuid(uuid);
    return formatAdminProductResponse(refreshed ?? updated, cachedCategory);
  },

  async deleteAdminProduct(uuid: string, adminEmail?: string) {
    const existing = await productRepository.findByUuid(uuid);
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    const adminId = await getAdminInternalId(adminEmail);
    await productRepository.softDeleteByUuid(uuid, adminId);

    return {
      success: true,
      message: "Product deleted successfully",
    };
  },

  async bulkDeleteAdminProducts(uuids: string[], adminEmail?: string) {
    if (!uuids || uuids.length === 0) {
      throw ApiError.badRequest("At least one product ID is required");
    }

    const adminId = await getAdminInternalId(adminEmail);
    const result = await productRepository.bulkSoftDeleteByUuids(uuids, adminId);

    return {
      success: true,
      count: result.count,
      message: `Successfully deleted ${result.count} products`,
    };
  },


  async getProduct(idOrUuid: string | number) {
    const str = String(idOrUuid);
    const existing = await productRepository.findByUuid(str);
    if (existing) return formatAdminProductResponse(existing);
    try {
      const byId = await productRepository.findById(BigInt(str));
      if (byId) return formatAdminProductResponse(byId);
    } catch {}
    throw ApiError.notFound("Product not found");
  },

  async createProduct(data: any, adminEmail?: string) {
    return this.createAdminProduct(data, adminEmail);
  },

  async updateProduct(idOrUuid: string | number, data: any, adminEmail?: string) {
    const str = String(idOrUuid);
    let uuid = str;
    const existing = await productRepository.findByUuid(str);
    if (existing?.uuid) {
      uuid = existing.uuid;
    } else {
      try {
        const byId = await productRepository.findById(BigInt(str));
        if (byId?.uuid) uuid = byId.uuid;
      } catch {}
    }
    return this.updateAdminProduct(uuid, data, adminEmail);
  },

  async deleteProduct(idOrUuid: string | number, adminEmail?: string) {
    const str = String(idOrUuid);
    let uuid = str;
    const existing = await productRepository.findByUuid(str);
    if (existing?.uuid) {
      uuid = existing.uuid;
    } else {
      try {
        const byId = await productRepository.findById(BigInt(str));
        if (byId?.uuid) uuid = byId.uuid;
      } catch {}
    }
    return this.deleteAdminProduct(uuid, adminEmail);
  },
};
