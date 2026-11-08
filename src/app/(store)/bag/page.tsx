import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BagLine } from "@/components/bag/bag-line";
import { NewArrivals } from "@/components/home/new-arrivals";
import { OrderTotals } from "@/components/bag/order-totals";
import { getBag } from "@/lib/bag";

export const metadata: Metadata = {
  title: "Shopping Bag",
  robots: { index: false },
};

export default function BagPage() {
  return (
    <>
      <section aria-labelledby="bag-title" className="page pt-6 pb-(--section-y)">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
            <li>
              <Link href="/" className="link-quiet">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              Shopping Bag
            </li>
          </ol>
        </nav>

        {/* The bag lives in a cookie: read it inside Suspense so the shell stays static */}
        <Suspense fallback={<BagSkeleton />}>
          <BagContents />
        </Suspense>
      </section>

      <NewArrivals />
    </>
  );
}

async function BagContents() {
  const bag = await getBag();
  const hasSoldOut = bag.lines.some((line) => line.available === 0);

  return (
    <>
      <header className="mt-8 flex items-end justify-between gap-6 border-b pb-6 lg:mt-12 lg:pb-8">
        <div>
          <p className="eyebrow text-muted">Your Selection</p>
          <h1 id="bag-title" className="mt-2 text-title-xl">
            Shopping Bag
          </h1>
        </div>
        <p className="shrink-0 text-caption text-muted uppercase">
          {bag.itemCount} {bag.itemCount === 1 ? "piece" : "pieces"}
        </p>
      </header>

      {bag.lines.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center lg:py-24">
          <p className="text-title-m">Your bag is empty</p>
          <p className="mt-3 max-w-sm text-body-s text-muted">
            Pieces you add will be kept here for 30 days.
          </p>
          <Link href="/new-in" className="btn btn-primary mt-8">
            Shop new in
          </Link>
        </div>
      ) : (
        <div className="grid-layout gap-y-10">
          <ul className="col-span-4 lg:col-span-8">
            {bag.lines.map((line) => (
              <BagLine key={line.product.id} line={line} />
            ))}
          </ul>

          <aside
            aria-labelledby="summary-title"
            className="col-span-4 lg:col-span-4 lg:pt-8"
          >
            <div className="bg-surface p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:p-8">
              <h2 id="summary-title" className="eyebrow">
                Order Summary
              </h2>

              <div className="mt-6">
                <OrderTotals subtotal={bag.subtotal} />
              </div>

              <div className="mt-8 flex flex-col gap-3">
                {hasSoldOut || bag.itemCount === 0 ? (
                  <button type="button" className="btn btn-primary btn-lg btn-block" disabled>
                    Checkout
                  </button>
                ) : (
                  <Link href="/checkout" className="btn btn-primary btn-lg btn-block">
                    Checkout
                  </Link>
                )}
                {hasSoldOut && (
                  <p role="status" className="text-center text-caption text-error uppercase">
                    Remove sold-out pieces to continue
                  </p>
                )}
                <Link href="/new-in" className="btn btn-secondary btn-block">
                  Continue shopping
                </Link>
              </div>

              <ul className="mt-8 flex flex-col gap-2 border-t pt-6 text-caption text-muted uppercase">
                <li>Complimentary express shipping and returns</li>
                <li>Returns within 30 days</li>
                <li>Signature gift packaging</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// Mirrors the heading and two-column layout so nothing shifts when it streams in
function BagSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bag">
      <div className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
        <div className="h-4 w-24 bg-surface" />
        <div className="mt-2 h-10 w-56 bg-surface lg:h-14" />
      </div>
      <div className="grid-layout gap-y-10">
        <div className="col-span-4 lg:col-span-8">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b py-6 lg:gap-6 lg:py-8">
              <div className="media-frame aspect-portrait w-24 sm:w-32 lg:w-40" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-16 bg-surface" />
                <div className="h-4 w-1/2 bg-surface" />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-4 h-80 bg-surface lg:mt-8" />
      </div>
    </div>
  );
}
