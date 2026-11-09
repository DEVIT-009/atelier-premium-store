// A customer's own orders. Every read is limited to the signed-in user's id and
// stays uncached, so a change made by staff shows on the next visit. Only fields
// meant for the customer leave this file: never the KHQR, Bakong data, or the
// actor and reason on order_events.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orderItems, orders } from "@/db/schema";
import { isUuid } from "@/lib/admin";
import { FULFILMENT_STEPS, type FulfilmentStatus } from "@/lib/admin-orders";

type OrderRow = typeof orders.$inferSelect;

// What the customer is told, from the order's payment and fulfilment status
export type OrderStage =
  | "awaiting_payment"
  | "under_review"
  | "confirmed"
  | Exclude<FulfilmentStatus, "unfulfilled">
  | "expired"
  | "cancelled"
  | "refunded";

export type OrderListEntry = {
  id: string;
  reference: string;
  placedAt: Date;
  stage: OrderStage;
  total: number; // USD cents
  pieces: number;
  firstItem: { name: string; image: string } | null;
  otherLines: number;
};

export type OrderTimelineStep = { label: string; at: Date | null; done: boolean };

export type OrderDetail = {
  id: string;
  reference: string;
  placedAt: Date;
  stage: OrderStage;
  subtotal: number; // USD cents
  shipping: number;
  total: number;
  delivery: OrderRow["delivery"];
  receiverName: string;
  phone: string | null;
  province: string | null;
  addressDetail: string | null;
  note: string | null;
  trackingReference: string | null;
  expiresAt: Date;
  refund: { amount: number | null; at: Date | null } | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    image: string;
    href: string | null; // only while the product is on the store
  }[];
  timeline: OrderTimelineStep[];
};

const PAGE_SIZE = 10;

const FULFILMENT_STEP_LABELS: Record<FulfilmentStatus, string> = {
  unfulfilled: "Order confirmed",
  processing: "Preparing your pieces",
  shipped: "On its way",
  delivered: "Delivered",
  ready_for_pickup: "Ready for pickup",
  collected: "Collected",
};

// Expiry only runs when an order is placed or the cron fires, so a pending order
// past its QR's lifetime already reads as expired here
function isPastExpiry(order: Pick<OrderRow, "status" | "expiresAt">) {
  return order.status === "pending" && order.expiresAt.getTime() < Date.now();
}

function orderStage(order: Pick<OrderRow, "status" | "fulfilmentStatus" | "expiresAt">): OrderStage {
  switch (order.status) {
    case "pending":
      return isPastExpiry(order) ? "expired" : "awaiting_payment";
    case "paid_late":
      return "under_review";
    case "paid":
      return order.fulfilmentStatus === "unfulfilled" ? "confirmed" : order.fulfilmentStatus;
    default:
      return order.status;
  }
}

// A date comes from the latest matching event, because staff can step a
// fulfilment status back and forward again
function buildTimeline(
  order: OrderRow,
  events: { toStatus: string; createdAt: Date }[],
): OrderTimelineStep[] {
  const lastAt = (status: string) =>
    events.filter((event) => event.toStatus === status).at(-1)?.createdAt ?? null;

  const placed = { label: "Order placed", at: order.createdAt, done: true };
  const expired = { label: "QR code expired", at: order.expiresAt, done: true };

  switch (order.status) {
    case "pending":
      return isPastExpiry(order)
        ? [placed, expired]
        : [placed, { label: "Awaiting payment", at: null, done: false }];
    case "expired":
      return [placed, expired];
    case "cancelled":
      return [placed, { label: "Cancelled", at: lastAt("cancelled"), done: true }];
    case "paid_late":
      return [
        placed,
        { label: "Payment received after expiry", at: order.paidAt, done: true },
        { label: "Under review", at: null, done: false },
      ];
    case "refunded":
      return [
        placed,
        ...(order.paidAt ? [{ label: "Payment confirmed", at: order.paidAt, done: true }] : []),
        { label: "Refunded", at: order.refundedAt, done: true },
      ];
    case "paid": {
      const steps: readonly FulfilmentStatus[] = FULFILMENT_STEPS[order.delivery];
      const reached = steps.indexOf(order.fulfilmentStatus);
      return [
        placed,
        { label: "Payment confirmed", at: order.paidAt, done: true },
        // The first step is "unfulfilled", which the payment step already covers
        ...steps.slice(1).map((step, index) => {
          const done = index + 1 <= reached;
          return { label: FULFILMENT_STEP_LABELS[step], at: done ? lastAt(step) : null, done };
        }),
      ];
    }
  }
}

// Newest first. `after` is the id of the last order on the previous page; the
// database compares its own created_at, which is more precise than a JS Date.
export async function listOrdersForUser(userId: string, after?: string) {
  const rows = await db.query.orders.findMany({
    where: and(
      eq(orders.userId, userId),
      after
        ? sql`(${orders.createdAt}, ${orders.id}) < (
            select o.created_at, o.id from ${orders} o
            where o.id = ${after}::uuid and o.user_id = ${userId}
          )`
        : undefined,
    ),
    columns: {
      id: true,
      reference: true,
      status: true,
      fulfilmentStatus: true,
      expiresAt: true,
      totalCents: true,
      createdAt: true,
    },
    with: {
      items: {
        columns: { productName: true, quantity: true },
        orderBy: [asc(orderItems.createdAt), asc(orderItems.id)],
        with: { product: { columns: { imageUrl: true } } },
      },
    },
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit: PAGE_SIZE + 1,
  });

  const page = rows.slice(0, PAGE_SIZE);
  const entries: OrderListEntry[] = page.map((order) => {
    const [first] = order.items;
    return {
      id: order.id,
      reference: order.reference,
      placedAt: order.createdAt,
      stage: orderStage(order),
      total: order.totalCents,
      pieces: order.items.reduce((sum, item) => sum + item.quantity, 0),
      firstItem: first ? { name: first.productName, image: first.product.imageUrl } : null,
      otherLines: Math.max(order.items.length - 1, 0),
    };
  });

  return {
    orders: entries,
    nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getOrderDetailForUser(
  orderId: string,
  userId: string,
): Promise<OrderDetail | undefined> {
  if (!isUuid(orderId)) return undefined;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    with: {
      items: {
        orderBy: [asc(orderItems.createdAt), asc(orderItems.id)],
        with: { product: { columns: { slug: true, imageUrl: true, status: true } } },
      },
      events: {
        columns: { toStatus: true, createdAt: true },
        orderBy: asc(orderEvents.createdAt),
      },
    },
  });
  if (!order) return undefined;

  return {
    id: order.id,
    reference: order.reference,
    placedAt: order.createdAt,
    stage: orderStage(order),
    subtotal: order.subtotalCents,
    shipping: order.shippingCents,
    total: order.totalCents,
    delivery: order.delivery,
    receiverName: order.receiverName,
    phone: order.phone,
    province: order.province,
    addressDetail: order.addressDetail,
    note: order.note,
    trackingReference: order.status === "paid" ? order.trackingReference : null,
    expiresAt: order.expiresAt,
    refund:
      order.status === "refunded"
        ? { amount: order.refundAmountCents, at: order.refundedAt }
        : null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPriceCents,
      image: item.product.imageUrl,
      href: item.product.status === "active" ? `/products/${item.product.slug}` : null,
    })),
    timeline: buildTimeline(order, order.events),
  };
}
