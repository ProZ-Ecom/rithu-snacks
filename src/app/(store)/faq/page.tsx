import type { Metadata } from "next";
import { FaqSection } from "@/components/storefront/faq";

export const metadata: Metadata = {
  title: "FAQs - Orders, Ingredients & Gifting",
  description:
    "Answers to common questions about delivery, ingredients, shelf life, packaging, bulk corporate gifting, returns and cancellations at Rithu's Snacks.",
};

export default function FaqPage() {
  return <FaqSection />;
}
