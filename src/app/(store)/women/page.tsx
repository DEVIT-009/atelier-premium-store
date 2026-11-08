import type { Metadata } from "next";
import { ProductListing } from "@/components/product/product-listing";
import { getDepartmentProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Women",
  description:
    "Shop women's ready-to-wear, bags, shoes and jewelry at Atelier, newest pieces first.",
};

export default async function WomenPage() {
  const products = await getDepartmentProducts("women");

  return (
    <ProductListing
      id="women-title"
      eyebrow="Department"
      title="Women"
      description="Ready-to-wear, bags and jewelry, with the pieces we make for everyone."
      products={products}
    />
  );
}
