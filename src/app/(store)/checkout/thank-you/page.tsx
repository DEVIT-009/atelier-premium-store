import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Services } from "@/components/home/services";
import { formatDateTime, formatPriceExact } from "@/lib/format";
import { getOrderForUser } from "@/lib/orders";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Thank You",
  robots: { index: false },
};

const nextSteps = [
  {
    title: "Confirmation",
    description: "Your order and payment are confirmed.",
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

export default function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  return (
    <>
      <section className="page section">
        {/* Session and ?order= are request data: read them inside Suspense */}
        <Suspense fallback={<ReceiptSkeleton />}>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </section>

      <NewArrivals />
      <Services />
    </>
  );
}

// The paid order, for its owner only; anything else goes back to the bag.
// A late payment isn't confirmed yet, so it doesn't read like one.
async function Confirmation({
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

  const late = order.status === "paid_late";

  return (
    <>
      <div className="mx-auto flex max-w-(--container-narrow) flex-col items-center text-center">
        <p className="eyebrow text-muted">{late ? "Payment Received" : "Order Confirmed"}</p>
        <h1 className="mt-3 text-title-xl">
          {late ? "We've received your payment" : "Thank you for your order"}
        </h1>
        <p className="mt-4 max-w-md text-lead text-muted">
          {late
            ? "Your payment arrived after the QR code expired, so your order isn't confirmed yet. Client Services will contact you to confirm your pieces or arrange a refund."
            : "We're preparing your pieces with care. We'll contact you when your order is on its way."}
        </p>

        <div className="mt-10 w-full border text-left">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b p-6 text-body-s">
            <div>
              <dt className="text-caption text-muted uppercase">Order</dt>
              <dd className="mt-1">{order.reference}</dd>
            </div>
            <div>
              <dt className="text-caption text-muted uppercase">Paid with KHQR</dt>
              <dd className="mt-1">{order.paidAt ? formatDateTime(order.paidAt) : "Confirmed"}</dd>
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
        </div>

        <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link href="/new-in" className="btn btn-primary">
            Continue shopping
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
      </div>

      {!late && (
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
      )}
    </>
  );
}

function ReceiptSkeleton() {
  return <div aria-busy="true" aria-label="Loading your order" className="mx-auto h-96 max-w-(--container-narrow) bg-surface" />;
}
