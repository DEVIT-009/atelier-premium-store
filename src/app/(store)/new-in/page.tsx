import type { Metadata } from "next";
import { ProductListing } from "@/components/product/product-listing";
import { getProducts } from "@/lib/products";

const NEW_IN_LIMIT = 24;

export const metadata: Metadata = {
  title: "New In",
  description:
    "The latest arrivals: ready-to-wear, bags, shoes and jewelry, newest first.",
};

export default async function NewInPage() {
  // Newest first (created_at desc)
  const products = await getProducts({ limit: NEW_IN_LIMIT });

  return (
    <ProductListing
      id="new-in-title"
      eyebrow="This Season"
      title="New In"
      description="The latest pieces to arrive in the atelier, newest first."
      products={products}
    />
  );
}
