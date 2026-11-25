import { Metadata } from "next";
import {
  AboutHeroSection,
  AboutOurStorySection,
  AboutFounderSection,
} from "@/components/storefront/about";

export const metadata: Metadata = {
  title: "About Us - Tradition in Every Bite",
  description:
    "Learn about Rithanya Food Products and Exports, established in 2021 in Namakkal, Tamil Nadu, delivering authentic South Indian snacks crafted with tradition and care.",
};

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* 1. Hero Banner: Tradition in Every Bite */}
      <AboutHeroSection />

      {/* 2. Our Story: Rooted in tradition, growing with purpose */}
      <AboutOurStorySection />

      {/* 3. The Woman Behind The Vision: Dr. S. Anita */}
      <AboutFounderSection />
    </div>
  );
}
