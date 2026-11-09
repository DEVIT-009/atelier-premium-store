import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { getProducts, SEARCH_QUERY_MAX_LENGTH, searchProducts } from "@/lib/products";

// Shown before anything is searched
const LATEST_LIMIT = 10;

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Atelier collection by piece, category or detail.",
  robots: { index: false },
};

type SearchParams = PageProps<"/search">["searchParams"];

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <section aria-labelledby="search-title" className="page pt-6 pb-(--section-y)">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            Search
          </li>
        </ol>
      </nav>

      {/* searchParams is URL data: read it inside Suspense so the shell stays static */}
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? "")
    .trim()
    .slice(0, SEARCH_QUERY_MAX_LENGTH);
  const products = query
    ? await searchProducts(query)
    : await getProducts({ limit: LATEST_LIMIT });

  return (
    <>
      <header className="mt-8 mb-8 border-b pb-6 lg:mt-12 lg:mb-12 lg:pb-8">
        <p className="eyebrow text-muted">Find a piece</p>
        <h1 id="search-title" className="mt-2 text-title-xl">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SearchForm key={query} query={query} />
          {query && (
            <p className="shrink-0 text-caption text-muted uppercase">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          )}
        </div>
      </header>

      {!query && products.length > 0 && (
        <h2 className="mb-6 text-caption text-muted uppercase lg:mb-8">
          Latest arrivals
        </h2>
      )}
      {products.length > 0 ? (
        <div className="grid-products">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : query ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-title-m">No pieces match your search</p>
          <p className="mt-3 text-body-s text-muted">
            Check the spelling or try a broader word.
          </p>
          <Link href="/new-in" className="btn btn-secondary mt-8">
            Browse new in
          </Link>
        </div>
      ) : null}
    </>
  );
}

function SearchForm({ query, disabled }: { query: string; disabled?: boolean }) {
  return (
    <Form action="/search" role="search" className="flex w-full gap-2 sm:max-w-md">
      <label htmlFor="search-query" className="sr-only">
        Search the collection
      </label>
      <input
        id="search-query"
        name="q"
        type="search"
        defaultValue={query}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        placeholder="Search the collection"
        autoFocus={!query}
        disabled={disabled}
        className="input"
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        <SearchIcon aria-hidden="true" className="sm:hidden" />
        <span className="max-sm:sr-only">Search</span>
      </button>
    </Form>
  );
}

// Same layout as the results, for the Suspense fallback
function SearchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading results">
      <div className="mt-8 mb-8 border-b pb-6 lg:mt-12 lg:mb-12 lg:pb-8">
        <div className="h-4 w-24 bg-surface" />
        <div className="mt-2 h-10 w-56 bg-surface lg:h-14" />
        <div className="mt-6">
          <SearchForm query="" disabled />
        </div>
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
