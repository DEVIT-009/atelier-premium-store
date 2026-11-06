import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/products";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  products: Product[];
};

// Listing page: breadcrumb, page heading with count, product grid
export function ProductListing({
  id,
  eyebrow,
  title,
  description,
  products,
}: Props) {
  return (
    <section aria-labelledby={id} className="page pt-6 pb-(--section-y)">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {title}
          </li>
        </ol>
      </nav>

      <header className="mt-8 mb-8 flex items-end justify-between gap-6 border-b pb-6 lg:mt-12 lg:mb-12 lg:pb-8">
        <div>
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 id={id} className="mt-2 text-title-xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-md text-body-s text-muted">
              {description}
            </p>
          )}
        </div>
        <p className="shrink-0 text-caption text-muted uppercase">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </p>
      </header>

      {products.length > 0 ? (
        <div className="grid-products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-title-m">Nothing here just yet</p>
          <p className="mt-3 text-body-s text-muted">
            New pieces land every week. Check back soon.
          </p>
          <Link href="/" className="btn btn-secondary mt-8">
            Back to home
          </Link>
        </div>
      )}
    </section>
  );
}

// Placeholder with the same layout, for Suspense fallbacks
export function ProductListingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className="page pt-6 pb-(--section-y)"
    >
      <div className="h-3.5 w-32 bg-surface" />
      <div className="mt-8 mb-8 border-b pb-6 lg:mt-12 lg:mb-12 lg:pb-8">
        <div className="h-4 w-24 bg-surface" />
        <div className="mt-2 h-10 w-56 bg-surface lg:h-14" />
      </div>
      <div className="grid-products">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="media-frame aspect-portrait" />
            <div className="mt-3 flex flex-col gap-2 px-1 lg:mt-4">
              <div className="h-3 w-16 bg-surface" />
              <div className="h-4 w-3/4 bg-surface" />
              <div className="h-4 w-12 bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
