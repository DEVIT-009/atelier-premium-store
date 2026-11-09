import Image from "next/image";
import Link from "next/link";
import { CopyReference } from "@/components/account/copy-reference";
import { OrderStageBadge } from "@/components/account/order-stage-badge";
import type { OrderDetail, OrderStage, OrderTimelineStep } from "@/lib/account-orders";
import { formatDate, formatDateTime, formatPriceExact } from "@/lib/format";

const STAGE_MESSAGES: Record<Exclude<OrderStage, "awaiting_payment">, string> = {
  under_review:
    "Your payment arrived after the QR code expired, so your order isn't confirmed yet. Client Services will contact you to confirm your pieces or arrange a refund.",
  confirmed: "We've received your payment and will begin preparing your pieces shortly.",
  processing: "Your pieces are being inspected and wrapped in signature packaging.",
  shipped: "Your order is on its way to you.",
  ready_for_pickup: "Your order is ready to collect in store.",
  delivered: "Your order has been delivered.",
  collected: "Your order has been collected.",
  expired:
    "The QR code for this order expired and your pieces were released. If you paid with this code, please contact Client Services with your order reference.",
  cancelled:
    "This order was cancelled and your pieces were released. If you paid for it, please contact Client Services with your order reference.",
  refunded: "This order has been refunded by bank transfer.",
};

export function OrderDetails({ order }: { order: OrderDetail }) {
  const pickup = order.delivery === "pickup";
  const deliveryRows = [
    ["Method", pickup ? "Pickup in store" : "Delivery"],
    ["Receiver", order.receiverName],
    ["Phone", order.phone],
    ["Province", order.province],
    ["Address", order.addressDetail],
    ["Tracking", order.trackingReference],
    ["Note", order.note],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <>
      <header className="mt-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between lg:mt-12 lg:pb-8">
        <div>
          <p className="eyebrow text-muted">Placed {formatDate(order.placedAt)}</p>
          <div className="mt-2 flex items-center gap-2">
            <h1 id="order-title" className="min-w-0 text-title-xl break-words">
              Order {order.reference}
            </h1>
            <CopyReference reference={order.reference} />
          </div>
        </div>
        <div className="shrink-0">
          <OrderStageBadge stage={order.stage} />
        </div>
      </header>

      <div className="grid-layout gap-y-10 pt-8 lg:pt-12">
        <div className="col-span-4 flex flex-col gap-10 lg:col-span-7">
          <section aria-labelledby="order-progress">
            <h2 id="order-progress" className="eyebrow">
              Progress
            </h2>
            {order.stage === "awaiting_payment" ? (
              <div className="mt-3 flex flex-col items-start gap-4">
                <p className="text-body-s text-muted">
                  We&apos;re holding your pieces until {formatDateTime(order.expiresAt)}. Return to your
                  bag and place the order again to see its QR code.
                </p>
                <Link href="/bag" className="btn btn-primary">
                  Return to bag
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-body-s text-muted">{STAGE_MESSAGES[order.stage]}</p>
            )}
            <OrderTimeline steps={order.timeline} />
          </section>

          <section aria-labelledby="order-items">
            <h2 id="order-items" className="eyebrow">
              Your Pieces
            </h2>
            <ul className="mt-6 border-t">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 border-b py-6 lg:gap-6">
                  <div className="media-frame aspect-portrait w-20 shrink-0 sm:w-24">
                    <Image src={item.image} alt="" fill sizes="(min-width: 640px) 96px, 80px" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4 text-body-s lg:text-body">
                    <div className="min-w-0">
                      <h3>
                        {item.href ? (
                          <Link href={item.href} className="link-quiet">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h3>
                      <p className="mt-1 text-body-s text-muted">Quantity {item.quantity}</p>
                    </div>
                    <p className="shrink-0">{formatPriceExact(item.unitPrice * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="col-span-4 flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
          <section aria-labelledby="order-delivery">
            <h2 id="order-delivery" className="eyebrow">
              {pickup ? "Pickup" : "Delivery"}
            </h2>
            <dl className="mt-6 flex flex-col border-t text-body-s">
              {deliveryRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 border-b py-4">
                  <dt className="shrink-0 text-muted">{label}</dt>
                  <dd className="min-w-0 text-right break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="order-summary" className="bg-surface p-6 lg:p-8">
            <h2 id="order-summary" className="eyebrow">
              Summary
            </h2>
            <dl className="mt-6 flex flex-col gap-3 text-body-s">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatPriceExact(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd>{order.shipping === 0 ? "Complimentary" : formatPriceExact(order.shipping)}</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t pt-5 text-title-s">
                <dt>Total</dt>
                <dd>{formatPriceExact(order.total)}</dd>
              </div>
              {order.refund?.amount != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Refunded</dt>
                  <dd>{formatPriceExact(order.refund.amount)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}

function OrderTimeline({ steps }: { steps: OrderTimelineStep[] }) {
  const current = steps.findLastIndex((step) => step.done);

  return (
    <ol className="mt-6 border-t pt-6">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={index === current ? "step" : undefined}
          className="relative flex gap-4 pb-6 last:pb-0"
        >
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="absolute top-3 -bottom-1 left-[0.3125rem] w-px bg-line" />
          )}
          <span
            aria-hidden="true"
            className={`relative mt-1.5 size-[0.6875rem] shrink-0 border ${
              step.done ? "border-foreground bg-foreground" : "border-line-strong bg-background"
            }`}
          />
          <div className="min-w-0 text-body-s">
            <p className={step.done ? undefined : "text-muted"}>
              {step.label}
              {!step.done && <span className="sr-only"> (not yet)</span>}
            </p>
            {step.at && <p className="mt-1 text-caption text-muted">{formatDateTime(step.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
