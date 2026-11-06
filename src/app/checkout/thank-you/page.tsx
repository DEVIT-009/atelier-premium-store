import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Services } from "@/components/home/services";
import { formatPriceExact } from "@/lib/format";
import { getOrderForUser } from "@/lib/orders";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Thank You",
  robots: { index: false },
};

const nextSteps = [
  {
    title: "Confirmation",
    description: "An order confirmation is on its way to your inbox.",
  },
  {
    title: "Preparation",
    description: "Your pieces are inspected and wrapped in signature packaging.",
  },
  {
    title: "Delivery",
    description: "Complimentary express delivery in 2–4 business days.",
  },
];

const paidTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Phnom_Penh",
});

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  return (
    <>
      <section aria-labelledby="thank-you-title" className="page section">
        <div className="mx-auto flex max-w-(--container-narrow) flex-col items-center text-center">
          <p className="eyebrow text-muted">Order Confirmed</p>
          <h1 id="thank-you-title" className="mt-3 text-title-xl">
            Thank you for your order
          </h1>
          <p className="mt-4 max-w-md text-lead text-muted">
            We&apos;re preparing your pieces with care. You&apos;ll receive an
            email when your order is on its way.
          </p>

          {/* Session and ?order= are request data: read them inside Suspense */}
          <Suspense fallback={<ReceiptSkeleton />}>
            <Receipt searchParams={searchParams} />
          </Suspense>

          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/new-in" className="btn btn-primary">
              Continue shopping
            </Link>
            <Link href="/" className="btn btn-secondary">
              Back to home
            </Link>
          </div>
        </div>

        <ol className="mt-16 grid grid-cols-1 border-t sm:grid-cols-3 lg:mt-24">
          {nextSteps.map((step, index) => (
            <li
              key={step.title}
              className="border-b px-1 py-8 sm:border-b-0 sm:px-6 sm:not-first:border-l lg:py-10"
            >
              <p className="text-caption text-muted">{`0${index + 1}`}</p>
              <h2 className="mt-3 text-title-s">{step.title}</h2>
              <p className="mt-2 text-body-s text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <NewArrivals />
      <Services />
    </>
  );
}

// The paid order, for its owner only; anything else goes back to the bag
async function Receipt({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const { order: orderId } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/account");

  const order =
    typeof orderId === "string" ? await getOrderForUser(orderId, session.user.id) : undefined;
  if (!order || (order.status !== "paid" && order.status !== "paid_late")) redirect("/bag");

  return (
    <div className="mt-10 w-full border text-left">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b p-6 text-body-s">
        <div>
          <dt className="text-caption text-muted uppercase">Order</dt>
          <dd className="mt-1">{order.reference}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted uppercase">Paid with KHQR</dt>
          <dd className="mt-1">{order.paidAt ? paidTime.format(order.paidAt) : "Confirmed"}</dd>
        </div>
      </dl>

      <ul className="flex flex-col gap-3 border-b p-6 text-body-s">
        {order.items.map((item) => (
          <li key={item.name} className="flex justify-between gap-4">
            <span>
              {item.name} <span className="text-muted">× {item.quantity}</span>
            </span>
            <span className="shrink-0">{formatPriceExact(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between gap-4 p-6 text-title-s">
        <span>Total paid</span>
        <span>{formatPriceExact(order.total)}</span>
      </div>

      {order.status === "paid_late" && (
        <p role="status" className="border-t p-6 text-body-s text-muted">
          Your payment arrived after the QR code expired. Client Services will
          contact you shortly to confirm your pieces or arrange a refund.
        </p>
      )}
    </div>
  );
}

function ReceiptSkeleton() {
  return <div aria-busy="true" aria-label="Loading your order" className="mt-10 h-64 w-full bg-surface" />;
}
