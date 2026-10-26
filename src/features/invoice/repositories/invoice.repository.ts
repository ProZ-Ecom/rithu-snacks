import crypto from "crypto";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db/prisma";

type Db = Prisma.TransactionClient | typeof db;

export const invoiceRepository = {
  /** Highest invoice number used in a financial year, so the next one can be suggested. */
  async getLastInvoiceNumber(financialYear: string, client: Db = db) {
    const result = await client.order.aggregate({
      where: { invoiceFinancialYear: financialYear },
      _max: { invoiceNumber: true },
    });
    return result._max.invoiceNumber ?? 0;
  },

  /** Matches by uuid, orderNumber, or numeric id, like findOrderForInvoice. */
  findOrderInvoiceNumber(orderRef: string) {
    const isNumeric = /^\d+$/.test(orderRef);
    return db.order.findFirst({
      where: {
        is_active: true,
        OR: [
          { uuid: orderRef },
          { orderNumber: orderRef },
          ...(isNumeric ? [{ id: BigInt(orderRef) }] : []),
        ],
      },
      select: { invoiceNumber: true, invoiceFinancialYear: true },
    });
  },

  findInvoiceNumberOwner(
    financialYear: string,
    invoiceNumber: number,
    client: Db = db
  ) {
    return client.order.findFirst({
      where: { invoiceFinancialYear: financialYear, invoiceNumber },
      select: { id: true },
    });
  },

  /**
   * Loads everything a GST tax invoice needs for one order: the line items with
   * their HSN code and GST slab, plus the billing/shipping addresses.
   * Matches by uuid, orderNumber, or numeric id.
   */
  async findOrderForInvoice(orderRef: string, ownerId?: bigint) {
    const isNumeric = /^\d+$/.test(orderRef);
    return db.order.findFirst({
      where: {
        is_active: true,
        OR: [
          { uuid: orderRef },
          { orderNumber: orderRef },
          ...(isNumeric ? [{ id: BigInt(orderRef) }] : []),
        ],
        ...(ownerId ? { userId: ownerId } : {}),
      },
      include: {
        user: {
          select: { name: true, email: true, phone: true, cust_id: true },
        },
        address: true,
        items: {
          where: { is_active: true },
          orderBy: { id: "asc" },
          include: {
            product: {
              select: {
                name: true,
                product_hsn_codes: {
                  select: {
                    code: true,
                    product_gst_rates: {
                      select: {
                        cgst_percent: true,
                        sgst_percent: true,
                        igst_percent: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async getCompany() {
    let company = await db.company.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    if (!company) {
      company = await db.company.findFirst({
        orderBy: { id: "asc" },
      });
    }

    if (!company) {
      try {
        company = await db.company.create({
          data: {
            uuid: crypto.randomUUID(),
            companyName: "Rithu's Snacks",
            email: "contact@rithusnacks.com",
            phone: "+91 98765 43210",
            address: "123 Traditional Bazaar Street",
            city: "Madurai",
            state: "Tamil Nadu",
            country: "India",
            pincode: "625001",
            isActive: true,
          },
        });
      } catch {
        company = await db.company.findFirst();
      }
    }

    return company;
  },
};
