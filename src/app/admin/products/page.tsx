import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNotice } from "@/components/admin/admin-notice";
import { ListControls, ListPager } from "@/components/admin/list-controls";
import { ProductStatusBadge } from "@/components/admin/product-status";
import { isUuid, requireAdmin } from "@/lib/admin";
import {
  listProductsForAdmin,
  PRODUCT_FILTERS,
  PRODUCT_NOTICES,
  type ProductFilter,
  type ProductNotice,
} from "@/lib/admin-products";
import { formatPriceExact } from "@/lib/format";

export const metadata: Metadata = {
  title: "Products",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function productsHref(filter: ProductFilter, query: string, after?: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (query) params.set("q", query);
  if (after) params.set("after", after);
  const search = params.toString();
  return search ? `/admin/products?${search}` : "/admin/products";
}

export default function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section aria-labelledby="admin-products-title" className="page pt-8 pb-(--section-y) lg:pt-12">
      <header className="flex items-end justify-between gap-4 border-b pb-6 lg:pb-8">
        <div>
          <p className="eyebrow text-muted">Admin</p>
          <h1 id="admin-products-title" className="mt-2 text-title-l">
            Products
          </h1>
        </div>
        <Link href="/admin/products/new" prefetch={false} className="btn btn-primary btn-sm">
          New product
        </Link>
      </header>

      {/* The session and search params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading products" className="mt-6 h-96 bg-surface" />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Products({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/products");

  const params = await searchParams;
  const filter = PRODUCT_FILTERS.find((option) => option.value === params.status)?.value ?? "all";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const after = isUuid(params.after) ? params.after : undefined;
  const notice = typeof params.notice === "string" ? PRODUCT_NOTICES[params.notice as ProductNotice] : undefined;

  const { products, nextCursor } = await listProductsForAdmin({ filter, query, after });

  return (
    <>
      {notice && <AdminNotice notice={notice} className="mt-6" />}

      <ListControls
        label="products"
        action="/admin/products"
        options={PRODUCT_FILTERS}
        filter={filter}
        query={query}
        searchLabel="Search by name or slug"
        placeholder="Name or slug"
        hrefFor={(value) => productsHref(value, query)}
      />

      {products.length === 0 ? (
        <div className="mt-6 border p-8 text-center">
          <p className="text-body-s text-muted">
            {after ? "No more products." : "No products match this view."}
          </p>
          <Link href="/admin/products" prefetch={false} className="link mt-3 inline-block text-body-s">
            View all products
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border-t">
          <table className="w-full text-left text-body-s">
            <thead>
              <tr className="border-b text-caption text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-normal">Product</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">Category</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal md:table-cell">Status</th>
                <th scope="col" className="hidden py-3 pr-4 text-right font-normal md:table-cell">
                  Available
                </th>
                <th scope="col" className="py-3 text-right font-normal">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b align-top">
                  <td className="py-4 pr-4">
                    <div className="flex gap-4">
                      <div className="media-frame aspect-portrait w-12 shrink-0">
                        <Image src={product.imageUrl} alt="" fill sizes="48px" />
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/products/${product.id}`} prefetch={false} className="link">
                          {product.name}
                        </Link>
                        <p className="mt-1 text-caption wrap-anywhere text-muted">{product.slug}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                          <ProductStatusBadge status={product.status} />
                          <span className="text-caption text-muted">{product.stock} available</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden py-4 pr-4 lg:table-cell">{product.categoryName}</td>
                  <td className="hidden py-4 pr-4 md:table-cell">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="hidden py-4 pr-4 text-right md:table-cell">{product.stock}</td>
                  <td className="py-4 text-right whitespace-nowrap">{formatPriceExact(product.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPager
        newestHref={after ? productsHref(filter, query) : undefined}
        olderHref={nextCursor ? productsHref(filter, query, nextCursor) : undefined}
      />
    </>
  );
}
