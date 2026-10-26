import type { Prisma } from "@/generated/prisma";
import { ApiError } from "@/lib/api/api-error";
import { userRepository } from "@/features/users/repositories/user.repository";
import { invoiceRepository } from "../repositories/invoice.repository";
import { rupeesInWords } from "../utils/amount-in-words";
import { financialYearOf } from "../utils/financial-year";
import { isSameState, resolveStateCode } from "../utils/state-codes";
import type {
  InvoiceBankDto,
  InvoiceDto,
  InvoiceHsnSummaryDto,
  InvoiceLineDto,
  InvoicePartyDto,
} from "../types";

/**
 * Catalogue prices are stored GST-inclusive (that is what the customer pays at
 * checkout), so the invoice back-calculates the taxable value out of the paid
 * amount. Flip this to false if prices ever become tax-exclusive.
 */
const PRICES_ARE_TAX_INCLUSIVE = true;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toNumber = (value: unknown) => Number(value ?? 0) || 0;

function readBankDetails(): InvoiceBankDto | null {
  const bankName = process.env.INVOICE_BANK_NAME?.trim();
  if (!bankName) return null;
  return {
    bankName,
    accountNumber: process.env.INVOICE_BANK_ACCOUNT?.trim() || "",
    branch: process.env.INVOICE_BANK_BRANCH?.trim() || "",
    ifsc: process.env.INVOICE_BANK_IFSC?.trim() || "",
    accountHolder: process.env.INVOICE_BANK_HOLDER?.trim() || "",
  };
}

export const invoiceService = {
  /**
   * Suggested invoice number for the admin to confirm when shipping. The series
   * is per financial year, so it starts again at 1 every April. If the order
   * already has a number it is returned as-is and cannot be changed.
   */
  async getNextInvoiceNumber(orderRef?: string) {
    if (orderRef) {
      const existing = await invoiceRepository.findOrderInvoiceNumber(orderRef);
      if (existing?.invoiceNumber) {
        return {
          invoiceNumber: existing.invoiceNumber,
          financialYear: existing.invoiceFinancialYear,
          locked: true,
        };
      }
    }

    const financialYear = financialYearOf(new Date());
    const last = await invoiceRepository.getLastInvoiceNumber(financialYear);
    return { invoiceNumber: last + 1, financialYear, locked: false };
  },

  /**
   * Stamps the admin-entered invoice number on an order (called when it is
   * shipped). The invoice date is the day of issue and decides the financial
   * year. An order keeps its first number; the same number cannot be used twice
   * in one financial year.
   */
  async assignInvoiceNumber(
    tx: Prisma.TransactionClient,
    order: { id: bigint; invoiceNumber: number | null },
    invoiceNumber: number | undefined
  ) {
    if (order.invoiceNumber) return;
    if (!invoiceNumber) {
      throw ApiError.badRequest("Invoice number is required to ship the order");
    }

    const invoiceDate = new Date();
    const financialYear = financialYearOf(invoiceDate);

    const taken = await invoiceRepository.findInvoiceNumberOwner(
      financialYear,
      invoiceNumber,
      tx
    );
    if (taken) {
      throw ApiError.conflict(
        `Invoice number ${invoiceNumber} is already used in ${financialYear}`
      );
    }

    try {
      await tx.order.update({
        where: { id: order.id },
        data: {
          invoiceNumber,
          invoiceFinancialYear: financialYear,
          invoiceDate,
        },
      });
    } catch (err) {
      // Two admins submitting the same number at once: the unique key catches it.
      if ((err as { code?: string })?.code === "P2002") {
        throw ApiError.conflict(
          `Invoice number ${invoiceNumber} is already used in ${financialYear}`
        );
      }
      throw err;
    }
  },

  /**
   * @param ownerUserId When given (a customer viewing their own invoice), the
   * order must belong to that user; admins pass nothing and can print any order.
   */
  async getOrderInvoice(
    orderUuid: string,
    ownerUserId?: string
  ): Promise<InvoiceDto> {
    let ownerId: bigint | undefined;
    if (ownerUserId) {
      const user = await userRepository.findById(ownerUserId);
      if (!user?.internalId) throw ApiError.unauthorized("User not found");
      ownerId = BigInt(user.internalId);
    }

    const [order, company] = await Promise.all([
      invoiceRepository.findOrderForInvoice(orderUuid, ownerId),
      invoiceRepository.getCompany(),
    ]);

    if (!order) throw ApiError.notFound("Order not found");
    if (!company) throw ApiError.notFound("Company settings not found");

    const billing =
      order.address.find((a) => a.type === "billing") ?? order.address[0] ?? null;
    const shipping =
      order.address.find((a) => a.type === "shipping") ?? billing;

    const sellerStateCode = resolveStateCode(company.state, company.gstNumber);
    const buyerStateCode = resolveStateCode(billing?.state);

    const seller: InvoicePartyDto = {
      name: company.companyName,
      addressLines: (company.address || "")
        .split(/\r?\n|,/)
        .map((line) => line.trim())
        .filter(Boolean),
      city: company.city,
      pincode: company.pincode,
      state: company.state,
      stateCode: sellerStateCode,
      gstin: company.gstNumber,
      pan: company.panNumber,
      phone: company.phone,
      email: company.email,
      logo: company.logo,
    };

    const buyer: InvoicePartyDto = {
      name: billing?.full_name || order.user.name,
      addressLines: [billing?.address_line1, billing?.address_line2, billing?.landmark]
        .map((line) => line?.trim())
        .filter((line): line is string => Boolean(line)),
      city: billing?.city ?? null,
      pincode: billing?.pincode ?? null,
      state: billing?.state ?? null,
      stateCode: buyerStateCode,
      gstin: null,
      pan: null,
      phone: billing?.phone || order.user.phone,
      email: order.user.email,
      logo: null,
    };

    const sameState = isSameState(company.state, billing?.state);

    const lines: InvoiceLineDto[] = order.items.map((item, index) => {
      const hsn = item.product.product_hsn_codes;
      const slab = hsn?.product_gst_rates;

      const cgstPercent = sameState ? toNumber(slab?.cgst_percent) : 0;
      const sgstPercent = sameState ? toNumber(slab?.sgst_percent) : 0;
      const igstPercent = sameState ? 0 : toNumber(slab?.igst_percent);
      const totalPercent = cgstPercent + sgstPercent + igstPercent;

      // What the customer actually paid for this line, after any offer.
      const paid = toNumber(item.total_price);
      const taxableValue = PRICES_ARE_TAX_INCLUSIVE
        ? round2(paid / (1 + totalPercent / 100))
        : round2(paid);

      const cgstAmount = round2((taxableValue * cgstPercent) / 100);
      const sgstAmount = round2((taxableValue * sgstPercent) / 100);
      const igstAmount = round2((taxableValue * igstPercent) / 100);
      const quantity = item.quantity;

      return {
        serial: index + 1,
        description: [item.product_name_snapshot, item.variant_snapshot]
          .filter(Boolean)
          .join(" - "),
        hsn: hsn?.code ?? null,
        quantity,
        per: "Pac",
        amount: round2(taxableValue + cgstAmount + sgstAmount + igstAmount),
        rate: quantity ? round2(taxableValue / quantity) : 0,
        taxableValue,
        cgstPercent,
        cgstAmount,
        sgstPercent,
        sgstAmount,
        igstPercent,
        igstAmount,
        totalTaxAmount: round2(cgstAmount + sgstAmount + igstAmount),
      };
    });

    // One row per HSN/SAC + rate combination, as the GST tax summary requires.
    const summaryMap = new Map<string, InvoiceHsnSummaryDto>();
    for (const line of lines) {
      const hsn = line.hsn || "-";
      const key = `${hsn}|${line.cgstPercent}|${line.sgstPercent}|${line.igstPercent}`;
      const existing = summaryMap.get(key);
      if (existing) {
        existing.taxableValue = round2(existing.taxableValue + line.taxableValue);
        existing.cgstAmount = round2(existing.cgstAmount + line.cgstAmount);
        existing.sgstAmount = round2(existing.sgstAmount + line.sgstAmount);
        existing.igstAmount = round2(existing.igstAmount + line.igstAmount);
        existing.totalTaxAmount = round2(
          existing.totalTaxAmount + line.totalTaxAmount
        );
      } else {
        summaryMap.set(key, {
          hsn,
          taxableValue: line.taxableValue,
          cgstPercent: line.cgstPercent,
          cgstAmount: line.cgstAmount,
          sgstPercent: line.sgstPercent,
          sgstAmount: line.sgstAmount,
          igstPercent: line.igstPercent,
          igstAmount: line.igstAmount,
          totalTaxAmount: line.totalTaxAmount,
        });
      }
    }

    const sum = (pick: (line: InvoiceLineDto) => number) =>
      round2(lines.reduce((acc, line) => acc + pick(line), 0));

    const taxableValue = sum((l) => l.taxableValue);
    const totalCgst = sum((l) => l.cgstAmount);
    const totalSgst = sum((l) => l.sgstAmount);
    const totalIgst = sum((l) => l.igstAmount);
    const totalTaxAmount = round2(totalCgst + totalSgst + totalIgst);
    const deliveryCharge = toNumber(order.shipping_charge);

    const beforeRounding = round2(taxableValue + totalTaxAmount + deliveryCharge);
    const invoiceValue = Math.round(beforeRounding);
    const roundOff = round2(invoiceValue - beforeRounding);

    const subTotal = beforeRounding;
    // The invoice is dated the day it was issued (shipping); orders not yet
    // shipped fall back to the order date.
    const invoiceDate = order.invoiceDate ?? order.placed_at ?? order.createdAt;
    const received = order.payment_status === "paid" ? invoiceValue : 0;

    return {
      invoiceNumber: order.invoiceNumber ? String(order.invoiceNumber) : null,
      financialYear: order.invoiceFinancialYear,
      placeOfSupply: [buyerStateCode, billing?.state].filter(Boolean).join("-") || null,
      invoiceDate,
      orderNumber: order.orderNumber,
      paymentStatus: order.payment_status,
      dispatchThrough: null,
      destination: shipping?.city ?? null,
      seller,
      buyer,
      sameState,
      lines,
      hsnSummary: Array.from(summaryMap.values()),
      totalQuantity: lines.reduce((acc, line) => acc + line.quantity, 0),
      taxableValue,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTaxAmount,
      deliveryCharge,
      discountAmount: toNumber(order.discountAmount),
      subTotal,
      roundOff,
      invoiceValue,
      received,
      balance: round2(invoiceValue - received),
      invoiceValueInWords: rupeesInWords(invoiceValue),
      taxAmountInWords: rupeesInWords(totalTaxAmount),
      bank: readBankDetails(),
    };
  },
};
