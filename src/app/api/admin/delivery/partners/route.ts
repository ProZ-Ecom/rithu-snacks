import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { db } from "@/lib/db/prisma";

export const GET = createApiHandler(
  {
    GET: async () => {
      let partners = await db.delivery_partners.findMany({
        where: {
          is_active: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
          contact_number: true,
          is_active: true,
        },
        orderBy: { id: "asc" },
      });

      // Self-healing: If no delivery partner exists in database (e.g. unseeded testing DB)
      if (partners.length === 0) {
        try {
          const stCourier = await db.delivery_partners.upsert({
            where: { code: "ST_COURIER" },
            update: { is_active: true },
            create: {
              name: "ST Courier",
              code: "ST_COURIER",
              contact_number: "+91 44 4000 0000",
              is_active: true,
            },
            select: {
              id: true,
              name: true,
              code: true,
              contact_number: true,
              is_active: true,
            },
          });
          partners = [stCourier];
        } catch (seedError) {
          console.warn("Delivery partner auto-seed failed:", seedError);
        }
      }

      const data = partners.map((p) => ({
        id: String(p.id),
        name: p.name,
        code: p.code,
        contactNumber: p.contact_number,
        isActive: p.is_active,
      }));

      return apiSuccess(data, "Delivery partners fetched successfully");
    },
  },
  {
    requireAuth: true,
    requiredRole: ["ADMIN", "STAFF"],
  }
);
