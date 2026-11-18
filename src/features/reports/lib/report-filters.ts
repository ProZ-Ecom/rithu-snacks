import { db } from "@/lib/db/prisma";

/**
 * Resolves a category reference (uuid, slug or numeric id) to product_categories.id.
 * Returns null when no category was asked for, and BigInt(0) for an unknown one so the filter matches nothing instead of everything.
 */
export async function resolveCategoryFilter(ref?: string | null): Promise<bigint | null> {
  if (!ref) return null;
  const row = await db.productCategory.findFirst({
    where: { OR: [{ uuid: ref }, { slug: ref }, ...(/^\d+$/.test(ref) ? [{ id: BigInt(ref) }] : [])] },
    select: { id: true },
  });
  return row?.id ?? BigInt(0);
}

/** Resolves a brand reference (uuid, slug or numeric id) to product_brands.id. */
export async function resolveBrandFilter(ref?: string | null): Promise<bigint | null> {
  if (!ref) return null;
  const row = await db.productBrand.findFirst({
    where: { OR: [{ uuid: ref }, { slug: ref }, ...(/^\d+$/.test(ref) ? [{ id: BigInt(ref) }] : [])] },
    select: { id: true },
  });
  return row?.id ?? BigInt(0);
}
