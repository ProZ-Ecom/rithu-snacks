import { db } from "@/lib/db/prisma";

export interface ReportOption {
  value: string;
  label: string;
}

export interface ReportOptions {
  categories: ReportOption[];
  brands: ReportOption[];
  paymentMethods: ReportOption[];
}

/**
 * Everything the report filter dropdowns need, in one call. Uses uuids as the
 * value so the filter resolvers accept them without exposing internal ids.
 */
export const reportOptionsService = {
  async all(): Promise<ReportOptions> {
    const [categories, brands, methods] = await Promise.all([
      db.productCategory.findMany({
        where: { isActive: true, deleted_at: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { uuid: true, id: true, name: true, parentId: true },
      }),
      db.productBrand.findMany({
        where: { isActive: true, deleted_at: null },
        orderBy: { name: "asc" },
        select: { uuid: true, id: true, name: true },
      }),
      db.payment_methods.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
    ]);

    // Sub-categories repeat names across parents,
    // so a bare name would give the picker several identical-looking rows.
    const nameById = new Map(categories.map((c) => [String(c.id), c.name]));
    const duplicated = new Set(
      categories.map((c) => c.name).filter((name, i, all) => all.indexOf(name) !== i)
    );

    return {
      categories: categories.map((c) => {
        const parent = c.parentId != null ? nameById.get(String(c.parentId)) : null;
        return {
          value: c.uuid ?? String(c.id),
          label: duplicated.has(c.name) && parent ? `${parent} › ${c.name}` : c.name,
        };
      }),
      brands: brands.map((b) => ({ value: b.uuid ?? String(b.id), label: b.name })),
      paymentMethods: methods.map((m) => ({ value: m.code, label: m.name })),
    };
  },
};
