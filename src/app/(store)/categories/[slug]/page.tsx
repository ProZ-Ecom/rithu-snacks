import type { Metadata } from "next";
import { db } from "@/lib/db/prisma";
import { CategoryProductsClient } from "./CategoryProductsClient";

interface CategoryProductsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryProductsPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "all") {
    return {
      title: "All Products & Snacks",
      description:
        "Explore our complete collection of handcrafted traditional South Indian snacks, sweets, and savories from RithuSnacks.",
      openGraph: {
        title: "All Products & Snacks | RithuSnacks",
        description:
          "Explore our complete collection of handcrafted traditional South Indian snacks, sweets, and savories from RithuSnacks.",
        type: "website",
        images: ["/logos/logo.svg"],
      },
    };
  }

  try {
    const category = await db.productCategory.findFirst({
      where: {
        OR: [{ slug }, { uuid: slug }],
        isActive: true,
        deleted_at: null,
      },
      select: {
        name: true,
        description: true,
        icon: true,
      },
    });

    if (!category) {
      return {
        title: "Snacks Collection",
        description:
          "Explore authentic South Indian snacks and sweets crafted with traditional recipes by RithuSnacks.",
      };
    }

    const title = category.name;
    const description =
      category.description ||
      `Buy authentic ${category.name} online from RithuSnacks. Handcrafted South Indian snacks and sweets made with traditional recipes.`;
    const imageUrl = category.icon || "/logos/logo.svg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [{ url: imageUrl, alt: category.name }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "Snacks Collection",
      description:
        "Explore authentic South Indian snacks and sweets from RithuSnacks.",
    };
  }
}

export default async function CategoryProductsPage(
  props: CategoryProductsPageProps
) {
  return <CategoryProductsClient {...props} />;
}
