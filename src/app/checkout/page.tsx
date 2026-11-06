import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderTotals } from "@/components/bag/order-totals";
import { DeliverySteps } from "@/components/checkout/delivery-steps";
import {
  CheckoutForm,
  KhqrCheckout,
  PlaceOrderButton,
} from "@/components/checkout/khqr-checkout";
import { Step } from "@/components/checkout/step";
import { Field } from "@/components/form/field";
import { getBag, type BagLine } from "@/lib/bag";
import { formatPrice } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <section aria-labelledby="checkout-title" className="page pt-6 pb-(--section-y)">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/bag" className="link-quiet">
              Shopping Bag
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            Checkout
          </li>
        </ol>
      </nav>

      <header className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
        <p className="eyebrow text-muted">Secure Checkout</p>
        <h1 id="checkout-title" className="mt-2 text-title-xl">
          Checkout
        </h1>
      </header>

      {/* The bag lives in a cookie: read it inside Suspense so the shell stays static */}
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContents />
      </Suspense>
    </section>
  );
}

async function CheckoutContents() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/checkout");

  const bag = await getBag();
  const hasSoldOut = bag.lines.some((line) => line.available === 0);

  if (bag.itemCount === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center lg:py-24">
        <p className="text-title-m">Your bag is empty</p>
        <p className="mt-3 max-w-sm text-body-s text-muted">
          Add a piece to your bag before checking out.
        </p>
        <Link href="/new-in" className="btn btn-primary mt-8">
          Shop new in
        </Link>
      </div>
    );
  }

  return (
    <KhqrCheckout>
      <div className="grid-layout gap-y-10 pt-8 lg:pt-12">
        {/* Placing the order opens the KHQR dialog; the total comes from the
            database, never from this form */}
        <CheckoutForm className="col-span-4 flex flex-col gap-12 lg:col-span-7">
          <Step number="01" title="Contact">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              defaultValue={session.user.email}
              hint="Your order confirmation will be sent here."
              required
              className="sm:col-span-2"
            />
            <Field
              id="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              hint="Only used by the courier about your delivery."
              className="sm:col-span-2"
            />
          </Step>

          <DeliverySteps />

          <Step number="04" title="Payment">
            {/* The only method for now; the server doesn't read it */}
            <label className="flex cursor-pointer items-start gap-4 border border-foreground p-5 sm:col-span-2">
              <input
                type="radio"
                name="paymentMethod"
                value="khqr"
                defaultChecked
                className="mt-1 size-4 accent-foreground"
              />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-body-s">Pay with KHQR</span>
                <span className="text-caption text-muted">
                  Scan with any Cambodian banking app. Your QR code appears when
                  you place your order.
                </span>
              </span>
            </label>
          </Step>

          <PlaceOrder hasSoldOut={hasSoldOut} className="flex lg:hidden" />
        </CheckoutForm>

        <aside
          aria-labelledby="summary-title"
          className="order-first col-span-4 lg:order-none lg:col-span-4 lg:col-start-9"
        >
          <div className="bg-surface p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="summary-title" className="eyebrow">
                Order Summary
              </h2>
              <Link href="/bag" className="nav-link link text-muted">
                Edit
              </Link>
            </div>

            <ul className="mt-6 flex flex-col gap-4 border-b pb-6">
              {bag.lines
                .filter((line) => line.available > 0)
                .map((line) => (
                  <SummaryLine key={line.product.id} line={line} />
                ))}
            </ul>

            <div className="mt-6">
              <OrderTotals subtotal={bag.subtotal} taxNote="Calculated at payment" />
            </div>

            {/* Desktop: beside the totals. Mobile: at the end of the form. */}
            <PlaceOrder hasSoldOut={hasSoldOut} className="mt-8 hidden lg:flex" />
          </div>
        </aside>
      </div>
    </KhqrCheckout>
  );
}

function PlaceOrder({
  hasSoldOut,
  className,
}: {
  hasSoldOut: boolean;
  className: string;
}) {
  return (
    <div className={`flex-col gap-3 ${className}`}>
      <PlaceOrderButton disabled={hasSoldOut} />
      {hasSoldOut && (
        <p role="status" className="text-center text-caption text-error uppercase">
          Remove sold-out pieces from your bag to continue
        </p>
      )}
      <p className="text-center text-caption text-muted uppercase">
        Complimentary delivery and returns
      </p>
    </div>
  );
}

function SummaryLine({ line }: { line: BagLine }) {
  const { product, available } = line;

  return (
    <li className="flex gap-4">
      <div className="media-frame aspect-portrait w-16 shrink-0">
        <Image src={product.image.src} alt="" fill sizes="64px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-caption text-muted uppercase">{product.category.name}</p>
        <p className="text-body-s">{product.name}</p>
        <p className="text-caption text-muted">Qty {available}</p>
      </div>
      <p className="shrink-0 text-body-s">{formatPrice(product.price * available)}</p>
    </li>
  );
}

// Mirrors the form and summary columns so nothing shifts when it streams in
function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading checkout" className="grid-layout gap-y-10 pt-8 lg:pt-12">
      <div className="col-span-4 flex flex-col gap-5 lg:col-span-7">
        <div className="h-8 w-40 bg-surface" />
        <div className="h-12 bg-surface" />
        <div className="h-12 bg-surface" />
        <div className="mt-7 h-8 w-56 bg-surface" />
        <div className="h-12 bg-surface" />
      </div>
      <div className="order-first col-span-4 h-96 bg-surface lg:order-none lg:col-start-9" />
    </div>
  );
}
