import { createApiHandler } from "@/lib/api/api-handler";
import { apiSuccess } from "@/lib/api/api-response";
import { invoiceService } from "@/features/invoice/services/invoice.service";

export const GET = createApiHandler(
  {
    GET: async (_request, context) => {
      const orderRef = context.searchParams?.get("order") || undefined;
      const result = await invoiceService.getNextInvoiceNumber(orderRef);
      return apiSuccess(result, "Invoice number fetched successfully", 200);
    },
  },
  {
    requireAuth: true,
    requiredRole: ["ADMIN", "STAFF"],
  }
);
