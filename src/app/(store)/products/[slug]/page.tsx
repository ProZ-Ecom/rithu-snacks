import type { Metadata } from "next";
import { db } from "@/lib/db/prisma";
import { ProductDetailClient } from "./ProductDetailClient";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await db.product.findFirst({
      where: {
        OR: [{ uuid: slug }, { slug: slug }],
        isActive: true,
        deleted_at: null,
      },
      select: {
        name: true,
        images: {
          where: { is_active: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          select: { image_url: true, altText: true },
          take: 1,
        },
        variants: {
          where: { isActive: true, deleted_at: null },
          select: {
            description: true,
            short_description: true,
            product_variant_images: {
              where: { is_active: true },
              orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
              select: { image_url: true },
              take: 1,
            },
          },
          take: 1,
        },
      },
    });

    if (!product) {
      return {
        title: "Product Details",
        description: "Explore authentic South Indian snacks and sweets from RithuSnacks.",
      };
    }

    const title = product.name;
    const description =
      product.variants[0]?.short_description ||
      product.variants[0]?.description ||
      `Buy fresh ${product.name} online from RithuSnacks. Authentic traditional South Indian recipe made with pure ingredients.`;
    const imageUrl =
      product.images[0]?.image_url ||
      product.variants[0]?.product_variant_images[0]?.image_url ||
      "/logos/logo.svg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            alt: product.name,
          },
        ],
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
      title: "Product Details",
      description: "Explore authentic South Indian snacks and sweets from RithuSnacks.",
    };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
