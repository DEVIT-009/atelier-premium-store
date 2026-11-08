import type { Metadata } from "next";
import { ProductListing } from "@/components/product/product-listing";
import { getDepartmentProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Men",
  description:
    "Shop men's ready-to-wear, shoes, watches and accessories at Atelier, newest pieces first.",
};

export default async function MenPage() {
  const products = await getDepartmentProducts("men");

  return (
    <ProductListing
      id="men-title"
      eyebrow="Department"
      title="Men"
      description="Ready-to-wear, shoes and watches, with the pieces we make for everyone."
      products={products}
    />
  );
}
