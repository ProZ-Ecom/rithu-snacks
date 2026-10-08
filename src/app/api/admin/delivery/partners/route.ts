import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { db } from "@/lib/db/prisma";

export const GET = createApiHandler(
  {
    GET: async () => {
      const partners = await db.delivery_partners.findMany({
        where: {
          is_active: true,
          code: "ST_COURIER",
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
