import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addToBag } from "@/app/bag/actions";
import { PendingButton } from "@/components/bag/pending-button";
import { SectionHeading } from "@/components/home/section-heading";
import { PlusIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { StockStatus } from "@/components/product/stock-status";
import { formatPrice } from "@/lib/format";
import {
  getCategoryHref,
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
  getStockStatus,
} from "@/lib/products";

// Prerender every known product; unknown slugs fall through to notFound()
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image.src, alt: product.image.alt }],
    },
  };
}

// params is URL data: read it inside Suspense so the shared App Shell stays
// URL-independent and navigations can be instant
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({
  params,
}: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const soldOut = getStockStatus(product.stock) === "sold-out";
  const categoryHref = getCategoryHref(product.category);
  const related = await getRelatedProducts(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image.src,
    category: product.category.name,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: "USD",
      availability: soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article className="lg:page lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pt-6">
        {/* Image: edge to edge on mobile, 7 of 12 columns from lg */}
        <div className="lg:col-span-7">
          <div className="media-frame aspect-portrait">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              preload
              sizes="(min-width: 1024px) 58vw, 100vw"
              className={soldOut ? "opacity-60" : undefined}
            />
          </div>
        </div>

        {/* Info panel: sticks beside the image while it scrolls on desktop */}
        <div className="lg:col-span-5">
          <div className="px-(--gutter) pt-8 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:px-0 lg:pt-0 lg:pl-8 xl:pl-16">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
                <li>
                  <Link href="/" className="link-quiet">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={categoryHref} className="link-quiet">
                    {product.category.name}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-foreground">
                  {product.name}
                </li>
              </ol>
            </nav>

            <div className="mt-8 lg:mt-12">
              {product.badge && !soldOut && (
                <p className="eyebrow mb-3">{product.badge}</p>
              )}
              <h1 className="text-title-l">{product.name}</h1>
              <p className="mt-3 text-lead">{formatPrice(product.price)}</p>
              <StockStatus stock={product.stock} className="mt-4" />
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {soldOut ? (
                <button type="button" className="btn btn-primary btn-lg btn-block" disabled>
                  Sold out
                </button>
              ) : (
                <form action={addToBag.bind(null, product.slug)}>
                  <PendingButton className="btn btn-primary btn-lg btn-block">
                    Add to bag
                  </PendingButton>
                </form>
              )}
              <p className="text-center text-caption text-muted uppercase">
                Complimentary express shipping and returns
              </p>
            </div>

            <p className="mt-10 text-body-s">{product.description}</p>

            <div className="mt-10 border-t">
              <Disclosure title="Details & care" defaultOpen>
                <ul className="flex list-disc flex-col gap-1.5 pl-4 marker:text-muted">
                  {product.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </Disclosure>
              <Disclosure title="Shipping & returns">
                <p>
                  Complimentary express delivery in 2–4 business days.
                  Returns and exchanges are free within 30 days of delivery.
                </p>
              </Disclosure>
              <Disclosure title="Gift wrapping">
                <p>
                  Every order arrives in signature packaging. Add a
                  handwritten note at checkout.
                </p>
              </Disclosure>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="page section">
          <SectionHeading
            id="related-title"
            eyebrow={product.category.name}
            title="You May Also Like"
            action={{ label: "View all", href: categoryHref }}
          />
          <div className="grid-products">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Mirrors the article layout so the page doesn't shift when content streams in
function ProductSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product"
      className="lg:page lg:grid lg:grid-cols-12 lg:gap-x-6 lg:pt-6"
    >
      <div className="lg:col-span-7">
        <div className="media-frame aspect-portrait" />
      </div>
      <div className="lg:col-span-5">
        <div className="flex flex-col px-(--gutter) pt-8 lg:px-0 lg:pt-0 lg:pl-8 xl:pl-16">
          <div className="h-3.5 w-40 bg-surface" />
          <div className="mt-8 h-8 w-3/4 bg-surface lg:mt-12 lg:h-10" />
          <div className="mt-3 h-7 w-24 bg-surface" />
          <div className="mt-8 h-14 w-full bg-surface" />
        </div>
      </div>
    </div>
  );
}

// Native <details>: keyboard accessible and works without JavaScript
function Disclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
        <span className="eyebrow">{title}</span>
        <PlusIcon className="transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-6 text-body-s text-muted">{children}</div>
    </details>
  );
}
