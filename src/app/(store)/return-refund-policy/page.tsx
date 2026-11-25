import type { Metadata } from "next";
import { PolicyLayout } from "@/components/storefront/policy/PolicyLayout";
import { RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "Learn about Rithu Snacks return, replacement, cancellation, and refund policies for food and snack orders.",
};

export default function ReturnRefundPolicyPage() {
  return (
    <PolicyLayout
      title="Return & Refund Policy"
      lastUpdated="September 9, 2026"
      icon={RotateCcw}
    >
      {/* Intro */}
      <section className="space-y-4">
        <p className="text-base sm:text-lg text-neutral-800 leading-relaxed font-medium">
          At <strong className="text-neutral-900 font-semibold">Rithu Snacks</strong>, we want you to receive your order in good condition and as expected. Because our products are food and snack items, returns and refunds may be subject to specific conditions relating to product safety, hygiene, freshness, and applicable law.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Please read this policy carefully before placing an order.
        </p>
      </section>

      {/* 1. General Return Policy */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          1. General Return Policy
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Due to the nature of food and snack products, we generally do not accept returns of products that have been opened, consumed, used, or handled in a manner that affects product safety or hygiene.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          A return, replacement, or refund may be considered in eligible situations such as:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>The wrong product was delivered.</li>
          <li>The product received is damaged.</li>
          <li>The product is defective or otherwise unsuitable due to an issue attributable to us.</li>
          <li>The product is missing from the order.</li>
          <li>The product received does not reasonably match the product ordered.</li>
          <li>The product has another verified issue that makes it eligible for a return, replacement, or refund.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          Eligibility is determined after reviewing the issue and supporting information.
        </p>
      </section>

      {/* 2. Damaged Products */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          2. Damaged Products
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If your order arrives damaged, please contact us as soon as possible after delivery.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Where appropriate, we may request:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Photographs of the outer packaging.</li>
          <li>Photographs of the damaged product.</li>
          <li>Photographs of the product label or batch information.</li>
          <li>Order details.</li>
          <li>A description of the issue.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          Please retain the product and packaging until the issue has been resolved, as they may be required for verification.
        </p>
      </section>

      {/* 3. Wrong or Missing Products */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          3. Wrong or Missing Products
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If you receive an incorrect product or an item is missing from your order, contact our customer support team with your order details.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          After verification, we may provide an appropriate resolution, which may include:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Replacement of the affected product.</li>
          <li>Refund for the affected product.</li>
          <li>Another resolution agreed upon with the customer, where applicable.</li>
        </ul>
      </section>

      {/* 4. Product Quality Issues */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          4. Product Quality Issues
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If you believe a product has a quality issue, please contact us promptly after delivery.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          For food products, customers should not consume a product if they believe it is unsafe, contaminated, damaged, tampered with, or otherwise unsuitable for consumption.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Please provide relevant information such as photographs, product details, batch/lot information, expiry or best-before information, and order details where available.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We will review the complaint and determine the appropriate resolution.
        </p>
      </section>

      {/* 5. Non-Returnable Situations */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          5. Non-Returnable Situations
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Returns or refunds may not be available for:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Products that have been opened or consumed, except where required by applicable law or where the issue itself makes the product defective or unsafe.</li>
          <li>Products damaged after delivery due to improper handling or storage by the customer.</li>
          <li>Products where the customer simply changes their mind, where return is not permitted for the relevant food product.</li>
          <li>Orders with incorrect delivery information provided by the customer, where the resulting issue is attributable to the customer.</li>
          <li>Requests submitted outside the applicable return/refund period.</li>
          <li>Products for which the customer cannot reasonably establish the claimed issue.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          These restrictions do not affect any rights that cannot legally be excluded under applicable law.
        </p>
      </section>

      {/* 6. Return/Refund Request Period */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          6. Return/Refund Request Period
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Customers should report any issue as soon as possible after delivery and preferably within <strong className="text-neutral-900 font-semibold">[insert number] hours/days</strong>.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          The exact time period may vary depending on the nature of the product or issue.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Claims submitted after the applicable period may not be accepted unless otherwise required by applicable law.
        </p>
      </section>

      {/* 7. How to Request a Return or Refund */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          7. How to Request a Return or Refund
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          To request a return, replacement, or refund:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-neutral-700">
          <li>Contact Rithu Snacks customer support.</li>
          <li>Provide your order number.</li>
          <li>Explain the issue clearly.</li>
          <li>Provide photographs or other supporting information when requested.</li>
          <li>Follow any instructions provided by our customer support team.</li>
        </ol>
        <p className="text-neutral-700 leading-relaxed">
          We will review the request and communicate the outcome.
        </p>
      </section>

      {/* 8. Refund Process */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          8. Refund Process
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If a refund is approved, the refund will generally be processed through the original payment method where technically and operationally possible.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          The time required for the refund to appear in your account may depend on:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Payment method.</li>
          <li>Payment service provider.</li>
          <li>Bank or financial institution.</li>
          <li>Processing timelines.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          Rithu Snacks cannot guarantee the exact time taken by a third-party payment provider or bank after the refund has been initiated.
        </p>
      </section>

      {/* 9. Partial Refunds */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          9. Partial Refunds
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          In appropriate circumstances, we may provide a partial refund for an affected product or portion of an order instead of a complete order refund.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          The refund amount will depend on the nature and extent of the verified issue.
        </p>
      </section>

      {/* 10. Replacement */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          10. Replacement
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Where a replacement is approved, we will make reasonable efforts to provide the replacement product, subject to product availability and delivery feasibility.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          If a replacement is not available, an appropriate refund may be provided.
        </p>
      </section>

      {/* 11. Cancellation and Refund */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          11. Cancellation and Refund
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If an order is successfully cancelled before processing or dispatch, an eligible refund may be initiated according to the applicable cancellation terms.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Once an order has been processed, packed, or dispatched, cancellation may no longer be possible.
        </p>
      </section>

      {/* 12. Delivery Failure */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          12. Delivery Failure
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If an order cannot be delivered because of circumstances attributable to the customer, such as an incorrect address, unavailable recipient, or repeated unsuccessful delivery attempts, the applicable refund or re-delivery options will depend on the circumstances and applicable law.
        </p>
      </section>

      {/* 13. Promotional Products and Discounts */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          13. Promotional Products and Discounts
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          For orders placed using coupons, discounts, promotional offers, or special pricing, the refund amount may be calculated based on the actual amount paid for the affected product/order and the applicable promotional terms.
        </p>
      </section>

      {/* 14. Refunds for Unavailable Products */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          14. Refunds for Unavailable Products
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If we are unable to fulfill a product that has already been paid for, we may cancel the affected product/order and initiate an appropriate refund for the amount paid for the unavailable product.
        </p>
      </section>

      {/* 15. Abuse of Return or Refund Policy */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          15. Abuse of Return or Refund Policy
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We reserve the right to investigate repeated, suspicious, fraudulent, or abusive return/refund requests.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Where permitted by applicable law, we may restrict or decline requests that we reasonably believe involve fraud or misuse of our policies.
        </p>
      </section>

      {/* 16. Changes to This Policy */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          16. Changes to This Policy
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We may update this Return &amp; Refund Policy from time to time.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Any changes will be posted on this page with a revised &quot;Last Updated&quot; date.
        </p>
      </section>

      {/* 17. Contact Us */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          17. Contact Us
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          For return, replacement, or refund-related questions, please contact:
        </p>
        <div className="rounded-xl border border-[var(--theme-border,#EBE0D0)] bg-[var(--theme-surface-alt,#FCF7EE)] p-5 mt-4 space-y-2">
          <p className="font-semibold text-neutral-900">Rithu Snacks</p>
          <p className="text-sm text-neutral-700">
            <strong>Email:</strong> [Insert customer support email]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Phone:</strong> [Insert official phone number]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Address:</strong> [Insert registered/business address]
          </p>
        </div>
        <p className="text-sm text-neutral-600 italic pt-2">
          Please keep your order number available when contacting customer support.
        </p>
      </section>
    </PolicyLayout>
  );
}
