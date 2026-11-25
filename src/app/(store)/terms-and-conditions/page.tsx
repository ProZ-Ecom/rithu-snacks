import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/storefront/policy/PolicyLayout";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the Terms & Conditions governing the use of the Rithu Snacks website, orders, payments, delivery, cancellations, and services.",
};

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      lastUpdated="September 9, 2026"
      icon={FileText}
    >
      {/* Intro */}
      <section className="space-y-4">
        <p className="text-base sm:text-lg text-neutral-800 leading-relaxed font-medium">
          Welcome to <strong className="text-neutral-900 font-semibold">Rithu Snacks</strong>. These Terms &amp; Conditions govern your access to and use of the Rithu Snacks website, mobile application, products, and services. By accessing or using our website or placing an order, you agree to be bound by these Terms &amp; Conditions.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          If you do not agree with any part of these terms, please do not use our website or services.
        </p>
      </section>

      {/* 1. About Rithu Snacks */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          1. About Rithu Snacks
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Rithu Snacks is an online platform through which customers can browse, select, and purchase food and snack products.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          The terms &quot;Rithu Snacks&quot;, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; refer to Rithu Snacks. The terms &quot;you&quot;, &quot;your&quot;, and &quot;customer&quot; refer to the person accessing the website or placing an order.
        </p>
      </section>

      {/* 2. Eligibility */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          2. Eligibility
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          By using our website, you confirm that:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>You are legally capable of entering into a binding agreement.</li>
          <li>The information you provide to us is accurate and complete.</li>
          <li>You will use the website only for lawful purposes.</li>
          <li>You will not misuse, disrupt, or attempt to gain unauthorized access to our website or services.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          If an order is placed on behalf of another person, you confirm that you are authorized to provide their information and place the order.
        </p>
      </section>

      {/* 3. Products and Product Information */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          3. Products and Product Information
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We make reasonable efforts to ensure that product names, descriptions, images, prices, ingredients, nutritional information, availability, and other product details displayed on the website are accurate.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          However:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Product images are provided for representation and may vary slightly from the actual product.</li>
          <li>Packaging and labeling may change from time to time.</li>
          <li>Product availability may change without prior notice.</li>
          <li>Minor variations in appearance, colour, size, or packaging may occur.</li>
          <li>Product information should always be checked on the actual product packaging where applicable.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          For food products, customers are responsible for reviewing ingredient, allergen, nutritional, and other relevant information before consumption.
        </p>
      </section>

      {/* 4. Account Registration */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          4. Account Registration
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Certain features may require you to create an account.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          You are responsible for:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Providing accurate information.</li>
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>Keeping your account information updated.</li>
          <li>All activities performed through your account.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          You should immediately inform us if you believe your account has been accessed without authorization.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We reserve the right to suspend or terminate accounts where we reasonably believe that the account is being misused, fraudulent, or in violation of these Terms &amp; Conditions.
        </p>
      </section>

      {/* 5. Placing an Order */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          5. Placing an Order
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          When you place an order through our website:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-neutral-700">
          <li>You select the products you wish to purchase.</li>
          <li>You provide the required delivery and contact information.</li>
          <li>You review your order and total amount.</li>
          <li>You select an available payment method.</li>
          <li>You submit the order.</li>
        </ol>
        <p className="text-neutral-700 leading-relaxed">
          Submitting an order constitutes a request to purchase the selected products. An order is considered accepted only when Rithu Snacks confirms the order.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We reserve the right to refuse, cancel, or limit an order where reasonably necessary, including situations involving product unavailability, pricing errors, suspected fraudulent activity, payment issues, or other operational reasons.
        </p>
      </section>

      {/* 6. Pricing */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          6. Pricing
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          All product prices displayed on the website are in Indian Rupees (INR), unless otherwise stated.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Prices may change from time to time. Any applicable delivery charges, taxes, or other charges will be displayed during the checkout process where applicable.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          If an incorrect price is displayed due to a technical or human error, we reserve the right to cancel the affected order and provide an appropriate refund where payment has already been made.
        </p>
      </section>

      {/* 7. Payments */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          7. Payments
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Payments may be processed through third-party payment service providers.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          You agree to provide valid payment information and authorize the applicable payment provider to process the transaction.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Rithu Snacks does not store sensitive payment information such as complete card numbers or payment passwords unless specifically stated otherwise in our Privacy Policy.
        </p>
      </section>

      {/* 8. Order Cancellation */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          8. Order Cancellation
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Orders may be cancelled only where cancellation is permitted under our cancellation process and the relevant order status.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Once an order has been processed, packed, dispatched, or otherwise reached a stage where cancellation is no longer possible, cancellation may not be available.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Any eligible refund resulting from cancellation will be processed according to our{" "}
          <Link
            href="/return-refund-policy"
            className="text-[var(--theme-primary,#5C1512)] font-medium hover:underline"
          >
            Return &amp; Refund Policy
          </Link>
          .
        </p>
      </section>

      {/* 9. Delivery */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          9. Delivery
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We will make reasonable efforts to deliver orders to the address provided during checkout.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Delivery times are estimates and may vary due to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Location</li>
          <li>Product availability</li>
          <li>Courier delays</li>
          <li>Weather conditions</li>
          <li>Public holidays</li>
          <li>Transportation issues</li>
          <li>Unforeseen circumstances</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          Customers are responsible for providing a complete and accurate delivery address and contact details.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          If an order cannot be delivered because of incorrect or incomplete information provided by the customer, additional delivery charges or other consequences may apply where permitted.
        </p>
      </section>

      {/* 10. Returns and Refunds */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          10. Returns and Refunds
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Returns and refunds are subject to our{" "}
          <Link
            href="/return-refund-policy"
            className="text-[var(--theme-primary,#5C1512)] font-medium hover:underline"
          >
            Return &amp; Refund Policy
          </Link>
          .
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Food and snack products may have specific return restrictions because of their nature, hygiene, safety, freshness, and applicable regulations.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Please review the Return &amp; Refund Policy before placing an order.
        </p>
      </section>

      {/* 11. Promotional Offers */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          11. Promotional Offers
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Rithu Snacks may provide discounts, coupons, promotional offers, or other benefits from time to time.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Promotional offers may:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Have specific eligibility requirements.</li>
          <li>Have validity periods.</li>
          <li>Be limited to certain products or customers.</li>
          <li>Have minimum order requirements.</li>
          <li>Not be combined with other offers unless expressly permitted.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          Rithu Snacks reserves the right to modify, suspend, or withdraw promotional offers where reasonably necessary.
        </p>
      </section>

      {/* 12. Intellectual Property */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          12. Intellectual Property
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          All content available on the Rithu Snacks website, including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Logos</li>
          <li>Brand names</li>
          <li>Product images</li>
          <li>Graphics</li>
          <li>Text</li>
          <li>Website design</li>
          <li>Icons</li>
          <li>Videos</li>
          <li>Software</li>
          <li>Other original materials</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          is owned by or licensed to Rithu Snacks unless otherwise stated.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          You may not copy, reproduce, modify, distribute, publish, sell, or commercially exploit our content without prior written permission.
        </p>
      </section>

      {/* 13. Prohibited Use */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          13. Prohibited Use
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          You must not:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Use the website for unlawful purposes.</li>
          <li>Attempt to gain unauthorized access to our systems.</li>
          <li>Introduce malicious software or harmful code.</li>
          <li>Interfere with the operation of the website.</li>
          <li>Use automated systems to scrape or copy website content without permission.</li>
          <li>Create fraudulent accounts or place fraudulent orders.</li>
          <li>Misuse promotional codes or offers.</li>
          <li>Impersonate another person or entity.</li>
        </ul>
      </section>

      {/* 14. Third-Party Services */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          14. Third-Party Services
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Our website may use third-party services such as payment gateways, delivery providers, analytics services, authentication providers, or other service providers.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Your use of such services may also be subject to the respective third party&apos;s terms and policies.
        </p>
      </section>

      {/* 15. Limitation of Liability */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          15. Limitation of Liability
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          To the extent permitted by applicable law, Rithu Snacks will not be responsible for losses resulting from circumstances beyond our reasonable control, including delivery delays caused by third parties, technical interruptions, natural events, or other unforeseen circumstances.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Nothing in these Terms &amp; Conditions is intended to exclude or limit any liability that cannot legally be excluded or limited under applicable law.
        </p>
      </section>

      {/* 16. Changes to These Terms */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          16. Changes to These Terms
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We may update these Terms &amp; Conditions from time to time.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Any updated version will be posted on this page with a revised &quot;Last Updated&quot; date.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Your continued use of our website after the updated terms are published constitutes your acceptance of the updated Terms &amp; Conditions, to the extent permitted by applicable law.
        </p>
      </section>

      {/* 17. Governing Law */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          17. Governing Law
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          These Terms &amp; Conditions shall be governed by and interpreted in accordance with the laws applicable in India.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Any disputes shall be subject to the jurisdiction of the courts having appropriate jurisdiction over Rithu Snacks, subject to applicable law.
        </p>
      </section>

      {/* 18. Contact Us */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          18. Contact Us
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If you have questions regarding these Terms &amp; Conditions, please contact us through the contact details provided on the Rithu Snacks website.
        </p>
        <div className="rounded-xl border border-[var(--theme-border,#EBE0D0)] bg-[var(--theme-surface-alt,#FCF7EE)] p-5 mt-4 space-y-2">
          <p className="font-semibold text-neutral-900">Rithu Snacks</p>
          <p className="text-sm text-neutral-700">
            <strong>Email:</strong> [Insert official email address]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Phone:</strong> [Insert official phone number]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Business Address:</strong> [Insert registered/business address]
          </p>
        </div>
      </section>
    </PolicyLayout>
  );
}
