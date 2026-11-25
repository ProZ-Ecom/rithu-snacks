
import type { Metadata } from "next";
import {
  HeroSlider,
  CategorySection,
  FeaturedSection,
  ProductSection,
  Banner,
  Pledge,
  Tradition,
  Features,
  Feedback,
  OfferPopup,
  OfferReels,
} from "@/components/storefront";

export const metadata: Metadata = {
  title: {
    absolute: "RithuSnacks | Authentic South Indian Heritage Snacks & Sweets",
  },
  description:
    "Handcrafted traditional South Indian snacks, sweets, and savories made with pure ingredients and heritage recipes from Namakkal. Order fresh snacks online with doorstep delivery.",
  openGraph: {
    title: "RithuSnacks | Authentic South Indian Heritage Snacks & Sweets",
    description:
      "Handcrafted traditional South Indian snacks, sweets, and savories made with pure ingredients and heritage recipes from Namakkal. Order fresh snacks online with doorstep delivery.",
    url: "/",
    siteName: "RithuSnacks",
    images: [
      {
        url: "/logos/logo.svg",
        width: 800,
        height: 600,
        alt: "RithuSnacks - Heritage Snacks",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RithuSnacks | Authentic South Indian Heritage Snacks & Sweets",
    description:
      "Handcrafted traditional South Indian snacks, sweets, and savories made with pure ingredients. Order online.",
    images: ["/logos/logo.svg"],
  },
};

export default function HomePage() {
  return (
    <div className="bg-white">
      <OfferPopup />
      <HeroSlider />
      <CategorySection />
      <FeaturedSection />
      <ProductSection />
      <Banner />
      <OfferReels />
      <Pledge />
      <Tradition />
      <Features />
      <Feedback />
    </div>
  );
}
