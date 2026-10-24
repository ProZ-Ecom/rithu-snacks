import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { bulkImportService, type ImportMode } from "@/features/import/services/bulk-import.service";
import { userRepository } from "@/features/users/repositories/user.repository";

/**
 * POST /api/admin/import/products
 * Accepts multipart/form-data with an Excel file (.xlsx)
 * Query params:
 *   ?preview=true  -> validate & preview only, no DB writes
 *   ?type=categories|products|variants -> which dedicated sheet the file contains
 *                    (omit for the legacy all-in-one workbook)
 */
export const POST = createApiHandler(
  {
    POST: async (request, context) => {
      const isDryRun = context.searchParams?.get("preview") === "true";

      const rawType = context.searchParams?.get("type");
      const mode = (rawType || "catalog") as ImportMode;
      if (!["catalog", "categories", "products", "variants"].includes(mode)) {
        throw ApiError.badRequest("Invalid import type");
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        throw ApiError.badRequest("No file uploaded");
      }

      if (!file.name.endsWith(".xlsx")) {
        throw ApiError.badRequest("Only .xlsx files are supported");
      }

      let adminUserId: bigint | null = null;
      const userEmail = context.session?.user?.email;
      if (userEmail) {
        const user = await userRepository.findByEmail(userEmail);
        if (user) {
          adminUserId = BigInt(user.internalId || user.id);
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await bulkImportService.importFromBuffer(
        buffer,
        adminUserId,
        isDryRun,
        mode
      );

      return apiSuccess(
        result,
        isDryRun ? "Import preview generated" : "Import completed successfully"
      );
    },
  },
  {
    method: "POST",
    requireAuth: true,
    requiredRole: ["ADMIN", "STAFF"],
  }
);
