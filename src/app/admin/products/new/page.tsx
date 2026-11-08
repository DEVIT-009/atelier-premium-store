import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createProductAction } from "@/app/admin/products/actions";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { DEPARTMENTS, IMAGE_HOSTS, listCategoriesForAdmin } from "@/lib/admin-products";
import { MAX_IMAGE_MB } from "@/lib/product-images";

export const metadata: Metadata = {
  title: "New product",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

export default function NewProductPage() {
  return (
    <section className="page pt-8 pb-(--section-y) lg:pt-12">
      <Link href="/admin/products" prefetch={false} className="nav-link link-quiet">
        ← Products
      </Link>
      <h1 className="mt-4 border-b pb-6 text-title-l lg:pb-8">New product</h1>

      {/* The session lives in a cookie: read it inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading form" className="mt-8 h-96 bg-surface" />}>
        <NewProductForm />
      </Suspense>
    </section>
  );
}

async function NewProductForm() {
  await requireAdmin("/admin/products/new");

  return (
    <div className="mt-8 max-w-(--container-narrow)">
      <ProductForm
        action={createProductAction}
        categories={await listCategoriesForAdmin()}
        departments={DEPARTMENTS}
        imageHosts={IMAGE_HOSTS}
        maxImageMb={MAX_IMAGE_MB}
      />
    </div>
  );
}
