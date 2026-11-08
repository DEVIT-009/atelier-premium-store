import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  acceptLatePaymentAction,
  cancelOrderAction,
  recheckPaymentAction,
  recordRefundAction,
  updateFulfilmentAction,
} from "@/app/admin/orders/actions";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { Details, Panel } from "@/components/admin/panel";
import {
  FULFILMENT_LABELS,
  FulfilmentBadge,
  OrderStatusBadge,
  statusLabel,
} from "@/components/admin/order-status";
import { Field } from "@/components/form/field";
import { requireAdmin } from "@/lib/admin";
import {
  fulfilmentNeighbours,
  getOrderForAdmin,
  hasLeftStore,
  ORDER_NOTICES,
  type OrderNotice,
} from "@/lib/admin-orders";
import { formatDateTime, formatPriceExact } from "@/lib/format";

export const metadata: Metadata = {
  title: "Order",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type Order = NonNullable<Awaited<ReturnType<typeof getOrderForAdmin>>>;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

export default function AdminOrderPage({ params, searchParams }: PageProps) {
  return (
    <section className="page pt-8 pb-(--section-y) lg:pt-12">
      <Link href="/admin/orders" prefetch={false} className="nav-link link-quiet">
        ← Orders
      </Link>

      {/* The session and params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading order" className="mt-6 h-96 bg-surface" />}>
        <OrderDetail params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function OrderDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);

  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const overdue = order.status === "pending" && order.expiresAt < new Date();
  const { notice: noticeKey } = await searchParams;
  const notice = typeof noticeKey === "string" ? ORDER_NOTICES[noticeKey as OrderNotice] : undefined;

  return (
    <>
      <header className="mt-4 border-b pb-6 lg:pb-8">
        <h1 className="text-title-l">{order.reference}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} overdue={overdue} />
          {order.status === "paid" && <FulfilmentBadge status={order.fulfilmentStatus} />}
          <span className="text-caption text-muted">Placed {formatDateTime(order.createdAt)}</span>
        </div>
      </header>

      {notice && <AdminNotice notice={notice} className="mt-6" />}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <Panel title="Pieces">
            <ul className="flex flex-col gap-3 text-body-s">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.productName}{" "}
                    <span className="text-muted">
                      × {item.quantity} at {formatPriceExact(item.unitPriceCents)}
                    </span>
                  </span>
                  <span className="shrink-0">{formatPriceExact(item.unitPriceCents * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between gap-4 border-t pt-4 text-title-s">
              <span>Total</span>
              <span>{formatPriceExact(order.totalCents)}</span>
            </div>
          </Panel>

          <Panel title="Customer">
            <Details
              rows={[
                ["Receiver", order.receiverName],
                ["Email", order.email],
                ["Phone", order.phone],
                ["Account", `${order.user.name} (${order.user.email})`],
                ["Method", order.delivery === "pickup" ? "Pickup in store" : "Delivery"],
                ["Province", order.province],
                ["Address", order.addressDetail],
                ["Tracking", order.trackingReference],
                ["Note", order.note],
              ]}
            />
          </Panel>

          <Panel title="Payment">
            <Details
              rows={[
                ["QR valid until", formatDateTime(order.expiresAt)],
                ["Paid at", order.paidAt && formatDateTime(order.paidAt)],
                ["Amount paid", order.paidAmountCents === null ? null : formatPriceExact(order.paidAmountCents)],
                ["Payer account", order.payerAccount],
                ["Bakong hash", order.bakongHash],
                ["KHQR MD5", order.khqrMd5],
                ["Refunded at", order.refundedAt && formatDateTime(order.refundedAt)],
                ["Refund amount", order.refundAmountCents === null ? null : formatPriceExact(order.refundAmountCents)],
                ["Refund reference", order.refundReference],
              ]}
            />
          </Panel>

          <Panel title="History">
            {order.events.length === 0 ? (
              <p className="text-body-s text-muted">No staff actions yet.</p>
            ) : (
              <ol className="flex flex-col gap-4 text-body-s">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <p>
                      {statusLabel(event.fromStatus)} → {statusLabel(event.toStatus)}
                      {event.stockChanged && (
                        <span className="text-muted">
                          {event.toStatus === "paid" ? " · stock reserved" : " · stock returned"}
                        </span>
                      )}
                    </p>
                    {event.reason && <p className="mt-1 text-muted">{event.reason}</p>}
                    <p className="mt-1 text-caption text-muted">
                      {event.actor.email} · {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside aria-label="Order actions" className="flex min-w-0 flex-col gap-10">
          <OrderActions order={order} />
        </aside>
      </div>
    </>
  );
}

// Each block appears only for the statuses it applies to; the server re-checks
function OrderActions({ order }: { order: Order }) {
  const canRecheck = order.status === "pending" || order.status === "expired" || order.status === "cancelled";

  return (
    <>
      {order.status === "paid_late" && (
        <Panel title="Late payment">
          <p className="mb-4 text-body-s text-muted">
            The customer paid after this QR stopped being valid, so its stock was released. Accepting reserves
            the stock again. If there isn&apos;t enough left, refund it instead.
          </p>
          <AdminActionForm
            action={acceptLatePaymentAction}
            hidden={{ orderId: order.id }}
            label="Accept and reserve stock"
            pendingLabel="Accepting…"
            primary
          >
            <Field id="accept-reason" name="reason" label="Note" maxLength={300} />
          </AdminActionForm>
        </Panel>
      )}

      {canRecheck && (
        <Panel title="Payment check">
          <p className="mb-4 text-body-s text-muted">
            Asks Bakong once whether this QR was paid. Bakong is the only proof of payment.
          </p>
          <AdminActionForm
            action={recheckPaymentAction}
            hidden={{ orderId: order.id }}
            label="Re-check payment"
            pendingLabel="Checking…"
          />
        </Panel>
      )}

      {order.status === "paid" && <FulfilmentPanel order={order} />}

      {order.status === "pending" && (
        <Panel title="Cancel order">
          <p className="mb-4 text-body-s text-muted">
            Checks Bakong first, then releases the stock. The customer can still scan this QR until{" "}
            {formatDateTime(order.expiresAt)}. A payment after cancelling shows up as a late payment.
          </p>
          <AdminActionForm
            action={cancelOrderAction}
            hidden={{ orderId: order.id }}
            label="Cancel order"
            pendingLabel="Cancelling…"
          >
            <Field id="cancel-reason" name="reason" label="Reason" required maxLength={300} />
          </AdminActionForm>
        </Panel>
      )}

      {(order.status === "paid" || order.status === "paid_late") && <RefundPanel order={order} />}
    </>
  );
}

function FulfilmentPanel({ order }: { order: Order }) {
  const { next, previous } = fulfilmentNeighbours(order.delivery, order.fulfilmentStatus);

  return (
    <Panel title="Fulfilment">
      <p className="mb-4 text-body-s text-muted">
        Now: {FULFILMENT_LABELS[order.fulfilmentStatus]}. The app doesn&apos;t notify customers, so contact them
        when this changes.
      </p>
      <div className="flex flex-col gap-3">
        {next && (
          <AdminActionForm
            key={next}
            action={updateFulfilmentAction}
            hidden={{ orderId: order.id }}
            label={`Mark as ${FULFILMENT_LABELS[next].toLowerCase()}`}
            pendingLabel="Updating…"
            primary
          >
            <input type="hidden" name="from" value={order.fulfilmentStatus} />
            <input type="hidden" name="to" value={next} />
            {next === "shipped" && (
              <Field id="tracking-reference" name="trackingReference" label="Tracking reference" maxLength={100} />
            )}
          </AdminActionForm>
        )}
        {previous && (
          <AdminActionForm
            key={previous}
            action={updateFulfilmentAction}
            hidden={{ orderId: order.id }}
            label={`Back to ${FULFILMENT_LABELS[previous].toLowerCase()}`}
            pendingLabel="Updating…"
          >
            <input type="hidden" name="from" value={order.fulfilmentStatus} />
            <input type="hidden" name="to" value={previous} />
          </AdminActionForm>
        )}
      </div>
    </Panel>
  );
}

function RefundPanel({ order }: { order: Order }) {
  const paidCents = order.paidAmountCents ?? order.totalCents;
  const stockNote =
    order.status === "paid_late"
      ? "Its stock was already released, so stock won't change."
      : hasLeftStore(order.fulfilmentStatus)
        ? "These pieces have left the store. Tick below only if they came back."
        : "The reserved stock goes back on sale.";

  return (
    <Panel title="Refund">
      {/* Collapsed so it can't be confused with the everyday actions above */}
      <details>
        <summary className="nav-link link-quiet cursor-pointer">Record a refund</summary>
        <p className="mt-4 mb-4 text-body-s text-muted">
          Send the money from the bank first: this only records it and can&apos;t be undone. {stockNote}
        </p>
        <AdminActionForm
          action={recordRefundAction}
          hidden={{ orderId: order.id }}
          label="Record refund"
          pendingLabel="Recording…"
        >
          <Field
            id="refund-amount"
            name="amount"
            label="Amount (USD)"
            inputMode="decimal"
            defaultValue={(paidCents / 100).toFixed(2)}
            required
          />
          <Field id="refund-reference" name="reference" label="Bank reference" required maxLength={100} />
          <Field id="refund-reason" name="reason" label="Reason" required maxLength={300} />
          {order.status === "paid" && hasLeftStore(order.fulfilmentStatus) && (
            <label className="flex items-center gap-2 text-body-s">
              <input type="checkbox" name="restock" />
              Return the pieces to stock
            </label>
          )}
        </AdminActionForm>
      </details>
    </Panel>
  );
}
