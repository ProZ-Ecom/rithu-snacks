import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";
import type {
  GetAdminProductsParams,
  AdminProductListParams,
  AdminProductsCountResponse,
} from "../types";

const productAdminInclude = Prisma.validator<Prisma.ProductInclude>()({
  brand: {
    select: {
      id: true,
      uuid: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  product_hsn_codes: {
    select: {
      id: true,
      uuid: true,
      code: true,
      description: true,
      is_active: true,
    },
  },
  images: {
    where: { is_active: true },
    select: {
      id: true,
      image_url: true,
      isPrimary: true,
      sortOrder: true,
    },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  },
  variants: {
    where: { deleted_at: null },
    include: {
      product_variant_images: {
        where: { is_active: true },
        select: {
          image_url: true,
          is_primary: true,
        },
      },
      variant_unit_prices: {
        where: { deleted_at: null },
        include: {
          product_units: {
            select: {
              id: true,
              uuid: true,
              name: true,
              code: true,
              type: true,
            },
          },
          inventories: {
            select: {
              quantity_available: true,
              quantity_reserved: true,
            },
          },
        },
        orderBy: [{ is_default: "desc" }, { unit_value: "asc" }],
      },
    },
    orderBy: [{ is_default: "desc" }, { id: "asc" }],
  },
});

export const productRepository = {
  async findByUuid(uuid: string) {
    return db.product.findFirst({
      where: { uuid, isActive: true, deleted_at: null },
      include: productAdminInclude,
    });
  },

  async findById(id: number | bigint) {
    return db.product.findFirst({
      where: { id: BigInt(id), isActive: true, deleted_at: null },
      include: productAdminInclude,
    });
  },

  async findByName(name: string, excludeUuid?: string) {
    return db.product.findFirst({
      where: {
        name,
        isActive: true,
        deleted_at: null,
        ...(excludeUuid ? { uuid: { not: excludeUuid } } : {}),
      },
    });
  },

  async findBySlug(slug: string, excludeUuid?: string) {
    return db.product.findFirst({
      where: {
        slug,
        isActive: true,
        deleted_at: null,
        ...(excludeUuid ? { uuid: { not: excludeUuid } } : {}),
      },
    });
  },

  async findAdminAll(params: GetAdminProductsParams = {}) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deleted_at: null,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { slug: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        include: productAdminInclude,
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

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

  buildAdminProductWhere(
    params: AdminProductListParams,
    resolvedCategoryInternalId?: bigint,
    resolvedBrandInternalId?: bigint,
    resolvedHsnCodeInternalId?: bigint
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (resolvedCategoryInternalId !== undefined) {
      where.categoryId = resolvedCategoryInternalId;
    }

    if (resolvedBrandInternalId !== undefined) {
      where.brandId = resolvedBrandInternalId;
    }

    if (resolvedHsnCodeInternalId !== undefined) {
      where.hsn_code_id = resolvedHsnCodeInternalId;
    }

    if (params.status !== undefined) {
      where.status = params.status;
    }

    if (params.search) {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    return where;
  },

  buildAdminProductBaseWhere(
    params: AdminProductListParams,
    resolvedCategoryInternalId?: bigint,
    resolvedBrandInternalId?: bigint,
    resolvedHsnCodeInternalId?: bigint
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
    };

    if (resolvedCategoryInternalId !== undefined) {
      where.categoryId = resolvedCategoryInternalId;
    }

    if (resolvedBrandInternalId !== undefined) {
      where.brandId = resolvedBrandInternalId;
    }

    if (resolvedHsnCodeInternalId !== undefined) {
      where.hsn_code_id = resolvedHsnCodeInternalId;
    }

    if (params.status !== undefined) {
      where.status = params.status;
    }

    if (params.search) {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    return where;
  },

  async countAdminList(
    params: AdminProductListParams,
    resolvedCategoryInternalId?: bigint,
    resolvedBrandInternalId?: bigint,
    resolvedHsnCodeInternalId?: bigint
  ): Promise<AdminProductsCountResponse> {
    const baseWhere = this.buildAdminProductBaseWhere(
      params,
      resolvedCategoryInternalId,
      resolvedBrandInternalId,
      resolvedHsnCodeInternalId
    );

    const [active, inactive, all] = await Promise.all([
      db.product.count({ where: { ...baseWhere, isActive: true } }),
      db.product.count({ where: { ...baseWhere, isActive: false } }),
      db.product.count({ where: baseWhere }),
    ]);

    return {
      active,
      inactive,
      all,
    };
  },

  async findAdminList(
    params: AdminProductListParams,
    resolvedCategoryInternalId?: bigint,
    resolvedBrandInternalId?: bigint,
    resolvedHsnCodeInternalId?: bigint
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? params.pageSize ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildAdminProductWhere(
      params,
      resolvedCategoryInternalId,
      resolvedBrandInternalId,
      resolvedHsnCodeInternalId
    );

    const sortField = params.sortBy ?? "createdAt";
    const sortOrder = params.sortOrder ?? "desc";

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        include: productAdminInclude,
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },


  async create(data: Prisma.ProductUncheckedCreateInput) {
    return db.product.create({
      data,
      include: productAdminInclude,
    });
  },

  async updateByUuid(
    uuid: string,
    data: Prisma.ProductUncheckedUpdateInput
  ) {
    const existing = await this.findByUuid(uuid);
    if (!existing) return null;

    return db.product.update({
      where: { id: existing.id },
      data,
      include: productAdminInclude,
    });
  },

  async softDeleteByUuid(uuid: string, adminId?: bigint | null) {
    const existing = await this.findByUuid(uuid);
    if (!existing) return null;

    const now = new Date();

    return db.$transaction(async (tx) => {
      // 1. Soft-delete the product
      const updatedProduct = await tx.product.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          status: false,
          deleted_at: now,
          ...(adminId ? { updated_by: adminId } : {}),
        },
        include: productAdminInclude,
      });

      // 2. Find all variants belonging to this product
      const relatedVariants = await tx.productVariant.findMany({
        where: { productId: existing.id, deleted_at: null },
        select: { id: true },
      });

      if (relatedVariants.length > 0) {
        const variantIds = relatedVariants.map((v) => v.id);

        // 3. Soft-delete all related variants
        await tx.productVariant.updateMany({
          where: { id: { in: variantIds } },
          data: {
            isActive: false,
            deleted_at: now,
            ...(adminId ? { updated_by: adminId } : {}),
          },
        });

        // 4. Soft-delete all variant unit prices
        await tx.variantUnitPrice.updateMany({
          where: { variant_id: { in: variantIds } },
          data: {
            isActive: false,
            deleted_at: now,
            ...(adminId ? { updated_by: adminId } : {}),
          },
        });
      }

      return updatedProduct;
    });
  },

  async bulkSoftDeleteByUuids(uuids: string[], adminId?: bigint | null) {
    if (!uuids || uuids.length === 0) return { count: 0 };
    const existingProducts = await db.product.findMany({
      where: { uuid: { in: uuids }, deleted_at: null },
      select: { id: true },
    });
    if (existingProducts.length === 0) return { count: 0 };

    const productIds = existingProducts.map((p) => p.id);
    const now = new Date();

    return db.$transaction(async (tx) => {
      const res = await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: {
          isActive: false,
          status: false,
          deleted_at: now,
          ...(adminId ? { updated_by: adminId } : {}),
        },
      });

      const relatedVariants = await tx.productVariant.findMany({
        where: { productId: { in: productIds }, deleted_at: null },
        select: { id: true },
      });

      if (relatedVariants.length > 0) {
        const variantIds = relatedVariants.map((v) => v.id);

        await tx.productVariant.updateMany({
          where: { id: { in: variantIds } },
          data: {
            isActive: false,
            deleted_at: now,
            ...(adminId ? { updated_by: adminId } : {}),
          },
        });

        await tx.variantUnitPrice.updateMany({
          where: { variant_id: { in: variantIds } },
          data: {
            isActive: false,
            deleted_at: now,
            ...(adminId ? { updated_by: adminId } : {}),
          },
        });
      }

      return res;
    });
  },
};
