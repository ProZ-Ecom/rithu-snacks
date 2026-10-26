import type { InvoiceDto } from "../types";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

/** 2.5 -> "2.5%", 18 -> "18%" */
const percent = (value: number) => `${Number(value)}%`;

const formatDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(date));
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("day")}-${pick("month")}-${pick("year")}`;
};

export function TaxInvoice({ invoice }: { invoice: InvoiceDto }) {
  const { seller, buyer, sameState } = invoice;

  const sellerName =
    seller.name?.replace(/Rithu\s*Snacks/i, "Rithu's Snacks") || "Rithu's Snacks";

  const sellerContact = [
    seller.phone && `Phone no.: ${seller.phone}`,
    seller.email && `Email: ${seller.email}`,
  ]
    .filter(Boolean)
    .join(" ");

  const sellerTax = [
    seller.gstin && `GSTIN: ${seller.gstin}`,
    seller.state &&
      `State: ${seller.stateCode ? `${seller.stateCode}-` : ""}${seller.state}`,
  ]
    .filter(Boolean)
    .join(", ");

  const buyerAddress = [
    ...buyer.addressLines,
    [buyer.city, buyer.pincode].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="ti-page">
      <h1 className="ti-title">Tax Invoice</h1>

      {/* Seller */}
      <div className="ti-seller">
        <p className="ti-seller-name">{sellerName}</p>
        {sellerContact && <p>{sellerContact}</p>}
        {sellerTax && <p>{sellerTax}</p>}
      </div>

      {/* Bill to + invoice details */}
      <table className="ti-box ti-head">
        <tbody>
          <tr>
            <td className="ti-bill">
              <p className="ti-heading">Bill To</p>
              <p className="ti-name">{buyer.name}</p>
              {buyerAddress && <p>{buyerAddress}</p>}
              {buyer.phone && <p>Contact No. : {buyer.phone}</p>}
              {buyer.gstin && <p>GSTIN : {buyer.gstin}</p>}
              {buyer.state && (
                <p>
                  State: {buyer.stateCode ? `${buyer.stateCode}-` : ""}
                  {buyer.state}
                </p>
              )}
            </td>
            <td className="ti-details">
              <p className="ti-heading">Invoice Details</p>
              <p>Invoice No. : {invoice.invoiceNumber ?? "-"}</p>
              <p>Date : {formatDate(invoice.invoiceDate)}</p>
              {invoice.placeOfSupply && (
                <p>Place of supply: {invoice.placeOfSupply}</p>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items */}
      <table className="ti-box ti-items">
        <thead>
          <tr>
            <td className="c">#</td>
            <td>Item name</td>
            <td className="c">HSN/ SAC</td>
            <td className="c">Quantity</td>
            <td className="c">Unit</td>
            <td className="r">Price/ Unit</td>
            <td className="r">Taxable amount</td>
            {sameState ? (
              <>
                <td className="r">CGST</td>
                <td className="r">SGST</td>
              </>
            ) : (
              <td className="r">IGST</td>
            )}
            <td className="r">Amount</td>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.serial}>
              <td className="c">{line.serial}</td>
              <td>{line.description}</td>
              <td className="c">{line.hsn || "-"}</td>
              <td className="c">{line.quantity}</td>
              <td className="c">{line.per}</td>
              <td className="r">{money(line.rate)}</td>
              <td className="r">{money(line.taxableValue)}</td>
              {sameState ? (
                <>
                  <td className="r">
                    {money(line.cgstAmount)}
                    <br />({percent(line.cgstPercent)})
                  </td>
                  <td className="r">
                    {money(line.sgstAmount)}
                    <br />({percent(line.sgstPercent)})
                  </td>
                </>
              ) : (
                <td className="r">
                  {money(line.igstAmount)}
                  <br />({percent(line.igstPercent)})
                </td>
              )}
              <td className="r">{money(line.amount)}</td>
            </tr>
          ))}
          <tr className="ti-total">
            <td />
            <td>Total</td>
            <td />
            <td className="c">{invoice.totalQuantity}</td>
            <td />
            <td />
            <td className="r">{money(invoice.taxableValue)}</td>
            {sameState ? (
              <>
                <td className="r">{money(invoice.totalCgst)}</td>
                <td className="r">{money(invoice.totalSgst)}</td>
              </>
            ) : (
              <td className="r">{money(invoice.totalIgst)}</td>
            )}
            <td className="r">
              {money(
                invoice.lines.reduce((acc, line) => acc + line.amount, 0)
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tax summary + amounts */}
      <table className="ti-box ti-summary">
        <tbody>
          <tr>
            <td className="ti-summary-tax">
              <table className="ti-tax">
                <thead>
                  <tr>
                    <td>Tax type</td>
                    <td className="r">Taxable amount</td>
                    <td className="r">Rate</td>
                    <td className="r">Tax amount</td>
                  </tr>
                </thead>
                <tbody>
                  {invoice.hsnSummary.flatMap((row, i) =>
                    sameState
                      ? [
                          <tr key={`s-${i}`}>
                            <td>SGST</td>
                            <td className="r">{money(row.taxableValue)}</td>
                            <td className="r">{percent(row.sgstPercent)}</td>
                            <td className="r">{money(row.sgstAmount)}</td>
                          </tr>,
                          <tr key={`c-${i}`}>
                            <td>CGST</td>
                            <td className="r">{money(row.taxableValue)}</td>
                            <td className="r">{percent(row.cgstPercent)}</td>
                            <td className="r">{money(row.cgstAmount)}</td>
                          </tr>,
                        ]
                      : [
                          <tr key={`i-${i}`}>
                            <td>IGST</td>
                            <td className="r">{money(row.taxableValue)}</td>
                            <td className="r">{percent(row.igstPercent)}</td>
                            <td className="r">{money(row.igstAmount)}</td>
                          </tr>,
                        ]
                  )}
                </tbody>
              </table>
            </td>
            <td className="ti-summary-amounts">
              <p className="ti-heading">Amounts</p>
              <table className="ti-amounts">
                <tbody>
                  <tr>
                    <td>Sub Total</td>
                    <td className="r">{money(invoice.subTotal)}</td>
                  </tr>
                  {invoice.deliveryCharge > 0 && (
                    <tr>
                      <td>Delivery Charges</td>
                      <td className="r">{money(invoice.deliveryCharge)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Round off</td>
                    <td className="r">
                      {invoice.roundOff < 0 ? "- " : ""}
                      {money(Math.abs(invoice.roundOff))}
                    </td>
                  </tr>
                  <tr className="ti-name">
                    <td>Total</td>
                    <td className="r">{money(invoice.invoiceValue)}</td>
                  </tr>
                  <tr>
                    <td>Received</td>
                    <td className="r">{money(invoice.received)}</td>
                  </tr>
                  <tr>
                    <td>Balance</td>
                    <td className="r">{money(invoice.balance)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words */}
      <div className="ti-box ti-pad">
        <p className="ti-heading">Invoice Amount In Words</p>
        <p>{invoice.invoiceValueInWords} Rupees only</p>
      </div>

      {/* Bank, terms, signatory */}
      <table className="ti-box ti-footer">
        <tbody>
          <tr>
            <td className="ti-bank">
              {invoice.bank && (
                <>
                  <p className="ti-heading">Bank Details</p>
                  <p>Name : {invoice.bank.bankName}</p>
                  <p>Account No. : {invoice.bank.accountNumber}</p>
                  <p>IFSC code : {invoice.bank.ifsc}</p>
                  {invoice.bank.accountHolder && (
                    <p>Account holder&apos;s name : {invoice.bank.accountHolder}</p>
                  )}
                </>
              )}
            </td>
            <td className="ti-terms">
              <p className="ti-heading">Terms and Conditions</p>
              <p>Thanks for doing business with us!</p>
            </td>
            <td className="ti-sign">
              <p>For : {sellerName}</p>
              <p className="ti-sign-line">Authorized Signatory</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
