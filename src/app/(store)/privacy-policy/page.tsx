import type { Metadata } from "next";
import { PolicyLayout } from "@/components/storefront/policy/PolicyLayout";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Rithu Snacks collects, uses, protects, and manages customer information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      lastUpdated="September 9, 2026"
      icon={Lock}
    >
      {/* Intro */}
      <section className="space-y-4">
        <p className="text-base sm:text-lg text-neutral-800 leading-relaxed font-medium">
          At <strong className="text-neutral-900 font-semibold">Rithu Snacks</strong>, we respect your privacy and are committed to protecting the personal information you provide when using our website, application, products, and services.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          This Privacy Policy explains what information we collect, how we use it, how we share it, and the choices available to you.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          By using the Rithu Snacks website or services, you acknowledge the practices described in this Privacy Policy.
        </p>
      </section>

      {/* 1. Information We Collect */}
      <section className="space-y-4 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          1. Information We Collect
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Depending on how you use our services, we may collect the following information.
        </p>

        {/* 1.1 Personal Information */}
        <div className="space-y-2 pl-2 sm:pl-4">
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
            1.1 Personal Information
          </h3>
          <p className="text-neutral-700 leading-relaxed">
            This may include:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-neutral-700">
            <li>Full name</li>
            <li>Email address</li>
            <li>Mobile/phone number</li>
            <li>Billing address</li>
            <li>Delivery address</li>
            <li>Account information</li>
            <li>Order information</li>
            <li>Communication preferences</li>
          </ul>
        </div>

        {/* 1.2 Order and Transaction Information */}
        <div className="space-y-2 pl-2 sm:pl-4 pt-3">
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
            1.2 Order and Transaction Information
          </h3>
          <p className="text-neutral-700 leading-relaxed">
            When you place an order, we may collect information relating to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-neutral-700">
            <li>Products purchased</li>
            <li>Order number</li>
            <li>Order date and time</li>
            <li>Order amount</li>
            <li>Delivery information</li>
            <li>Payment status</li>
            <li>Refund information</li>
            <li>Cancellation information</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed pt-1">
            Payment transactions may be processed through third-party payment providers. We generally do not require or store complete sensitive payment credentials such as card PINs or passwords.
          </p>
        </div>

        {/* 1.3 Device and Technical Information */}
        <div className="space-y-2 pl-2 sm:pl-4 pt-3">
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
            1.3 Device and Technical Information
          </h3>
          <p className="text-neutral-700 leading-relaxed">
            When you use our website, certain technical information may be collected automatically, such as:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-neutral-700">
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device type</li>
            <li>Operating system</li>
            <li>Approximate location information derived from technical data where applicable</li>
            <li>Pages visited</li>
            <li>Website interaction information</li>
            <li>Date and time of access</li>
            <li>Diagnostic and security information</li>
          </ul>
        </div>

        {/* 1.4 Cookies and Similar Technologies */}
        <div className="space-y-2 pl-2 sm:pl-4 pt-3">
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
            1.4 Cookies and Similar Technologies
          </h3>
          <p className="text-neutral-700 leading-relaxed">
            We may use cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-neutral-700">
            <li>Keep you signed in.</li>
            <li>Maintain shopping cart functionality.</li>
            <li>Remember preferences.</li>
            <li>Improve website performance.</li>
            <li>Understand how customers use our website.</li>
            <li>Detect and prevent fraud or abuse.</li>
          </ul>
          <p className="text-neutral-700 leading-relaxed pt-1">
            You may be able to control cookies through your browser settings. Disabling certain cookies may affect some website functionality.
          </p>
        </div>
      </section>

      {/* 2. How We Use Your Information */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          2. How We Use Your Information
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We may use your information to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Create and manage your account.</li>
          <li>Process and fulfill orders.</li>
          <li>Deliver products.</li>
          <li>Process payments and refunds.</li>
          <li>Communicate with you about your orders.</li>
          <li>Respond to customer support requests.</li>
          <li>Provide important service notifications.</li>
          <li>Improve our products and services.</li>
          <li>Improve website functionality and user experience.</li>
          <li>Detect and prevent fraud, abuse, and unauthorized activity.</li>
          <li>Maintain website security.</li>
          <li>Comply with applicable legal and regulatory requirements.</li>
          <li>Send promotional communications where permitted and where you have provided the required consent.</li>
        </ul>
      </section>

      {/* 3. How We Share Information */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          3. How We Share Information
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We do not sell your personal information merely for the purpose of selling personal information.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We may share relevant information with trusted service providers when necessary to operate our business, including:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Payment processors</li>
          <li>Delivery and logistics providers</li>
          <li>Technology and hosting providers</li>
          <li>Customer support providers</li>
          <li>Analytics and security providers</li>
          <li>Professional advisors</li>
          <li>Government authorities or law enforcement where required by law</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          We share only information reasonably necessary for the relevant purpose, subject to applicable law.
        </p>
      </section>

      {/* 4. Payment Information */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          4. Payment Information
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Payments may be processed by third-party payment providers.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          When you make a payment, you may be redirected to or interact with the payment provider&apos;s systems.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Payment providers may process your payment information according to their own privacy policies and terms.
        </p>
      </section>

      {/* 5. Data Security */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          5. Data Security
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We take reasonable technical and organizational measures to protect personal information against unauthorized access, alteration, disclosure, misuse, or destruction.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          However, no method of transmission or storage over the internet can be guaranteed to be completely secure.
        </p>
      </section>

      {/* 6. Data Retention */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          6. Data Retention
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We retain personal information for as long as reasonably necessary to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Provide our services.</li>
          <li>Complete transactions.</li>
          <li>Maintain business and financial records.</li>
          <li>Resolve disputes.</li>
          <li>Prevent fraud.</li>
          <li>Comply with legal, regulatory, accounting, or reporting obligations.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          When information is no longer required, we may securely delete, anonymize, or otherwise dispose of it, subject to applicable legal requirements.
        </p>
      </section>

      {/* 7. Your Privacy Choices and Rights */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          7. Your Privacy Choices and Rights
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Subject to applicable law, you may have rights regarding your personal information, including the ability to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-neutral-700">
          <li>Request access to certain personal information.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion where legally permitted.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Opt out of certain promotional communications.</li>
          <li>Raise a privacy-related complaint or grievance.</li>
        </ul>
        <p className="text-neutral-700 leading-relaxed">
          To exercise applicable rights, please contact us using the details provided below.
        </p>
      </section>

      {/* 8. Marketing Communications */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          8. Marketing Communications
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Where permitted by applicable law, we may send promotional communications about products, offers, discounts, or services.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          You may opt out of promotional communications by using the unsubscribe option included in the communication or by contacting us.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          You may continue to receive essential communications relating to your account, orders, payments, security, or other service-related matters even after opting out of promotional marketing.
        </p>
      </section>

      {/* 9. Children's Privacy */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          9. Children's Privacy
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Our services are not intentionally directed toward children who are not legally permitted to use the service independently.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          If we become aware that we have collected personal information from a child in circumstances where such collection is not permitted, we will take appropriate steps to address the situation in accordance with applicable law.
        </p>
      </section>

      {/* 10. Third-Party Websites */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          10. Third-Party Websites
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          Our website may contain links to third-party websites or services.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We are not responsible for the privacy practices, security, or content of third-party websites.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          We encourage you to review the privacy policies of third-party services before providing them with personal information.
        </p>
      </section>

      {/* 11. Changes to This Privacy Policy */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          11. Changes to This Privacy Policy
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          We may update this Privacy Policy from time to time to reflect changes in our services, technology, legal requirements, or business practices.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          When we make changes, we will update the &quot;Last Updated&quot; date on this page.
        </p>
      </section>

      {/* 12. Contact and Grievance */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          12. Contact and Grievance
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          If you have questions, concerns, requests, or complaints regarding this Privacy Policy or the handling of your personal information, please contact:
        </p>
        <div className="rounded-xl border border-[var(--theme-border,#EBE0D0)] bg-[var(--theme-surface-alt,#FCF7EE)] p-5 mt-4 space-y-2">
          <p className="font-semibold text-neutral-900">Rithu Snacks</p>
          <p className="text-sm text-neutral-700">
            <strong>Email:</strong> [Insert privacy/support email]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Phone:</strong> [Insert official phone number]
          </p>
          <p className="text-sm text-neutral-700">
            <strong>Address:</strong> [Insert registered/business address]
          </p>
          <div className="pt-2 mt-2 border-t border-[var(--theme-border,#EBE0D0)]">
            <p className="text-sm text-neutral-700">
              <strong>Grievance Officer:</strong> [Insert name/designation if applicable]
            </p>
            <p className="text-sm text-neutral-700">
              <strong>Grievance Email:</strong> [Insert grievance email]
            </p>
          </div>
        </div>
        <p className="text-neutral-700 leading-relaxed pt-2">
          We will handle privacy-related requests and complaints in accordance with applicable law.
        </p>
      </section>

      {/* 13. Applicable Law */}
      <section className="space-y-3 pt-6 border-t border-[var(--theme-border-subtle,#F0E6D6)]">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 font-serif">
          13. Applicable Law
        </h2>
        <p className="text-neutral-700 leading-relaxed">
          This Privacy Policy shall be interpreted in accordance with applicable laws and regulations in India.
        </p>
      </section>
    </PolicyLayout>
  );
}
