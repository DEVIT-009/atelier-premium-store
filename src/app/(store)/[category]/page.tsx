import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ProductListing,
  ProductListingSkeleton,
} from "@/components/product/product-listing";
import { getCategorySlugs, getCategoryWithProducts } from "@/lib/products";

// Prerender every known category; unknown slugs fall through to notFound()
export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const result = await getCategoryWithProducts(slug);
  if (!result) return {};

  return {
    title: result.category.name,
    description: `Shop ${result.category.name.toLowerCase()} at Atelier, newest pieces first.`,
  };
}

// params is URL data: read it inside Suspense so the shared App Shell stays
// URL-independent and navigations can be instant
export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <CategoryListing params={params} />
    </Suspense>
  );
}

async function CategoryListing({
  params,
}: Pick<PageProps<"/[category]">, "params">) {
  const { category: slug } = await params;
  const result = await getCategoryWithProducts(slug);
  if (!result) notFound();

  return (
    <ProductListing
      id="category-title"
      eyebrow="Collection"
      title={result.category.name}
      products={result.products}
    />
  );
}
