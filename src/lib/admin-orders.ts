// Staff access to orders. Every function checks the role itself and reads are
// never cached. Each status change is one conditional statement that also moves
// stock and writes the audit row, so repeating an action changes stock only once.
import { and, desc, eq, ilike, notInArray, or, sql, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { orderEvents, orderItems, orders, products, user } from "@/db/schema";
import { isUuid, requireAdmin } from "@/lib/admin";
import { isStockViolation, settleOrder, type PaymentCheck } from "@/lib/orders";

export type FulfilmentStatus = typeof orders.$inferSelect.fulfilmentStatus;

// Thrown when an action can't apply; the message is safe to show to staff
export class OrderActionError extends Error {}

// The order moved on since staff loaded the page, so the form may be gone too
export class OrderChangedError extends Error {}

// Shown at the top of the order page after an action, because a form can't show
// its own result once the order's new status has removed it
export const ORDER_NOTICES = {
  paid: { tone: "success", message: "Payment found. The order is now paid." },
  paid_late: {
    tone: "error",
    message: "Payment found after the QR stopped being valid. Accept or refund it.",
  },
  expired: {
    tone: "muted",
    message: "No payment found. The QR has expired, so the order expired and its stock was released.",
  },
  fulfilment: { tone: "success", message: "Fulfilment updated." },
  accepted: { tone: "success", message: "Payment accepted and stock reserved. The order is ready to fulfil." },
  cancelled: { tone: "success", message: "Order cancelled and its stock released." },
  cancel_paid: { tone: "error", message: "Payment found, so the order wasn't cancelled. It is now paid." },
  refunded: { tone: "success", message: "Refund recorded." },
  changed: { tone: "error", message: "This order just changed. Review it and try again." },
} as const;

export type OrderNotice = keyof typeof ORDER_NOTICES;

const PAGE_SIZE = 25;

export const ORDER_FILTERS = [
  { value: "all", label: "All" },
  { value: "paid_late", label: "Late payments" },
  { value: "to_fulfil", label: "To fulfil" },
  { value: "overdue", label: "Overdue" },
  { value: "pending", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

export type OrderFilter = (typeof ORDER_FILTERS)[number]["value"];

// Expiry only runs when an order is placed or the cron fires, so a pending order
// can be past its QR's lifetime: "overdue" comes from expires_at, not the status.
// The dashboard counts with these too, so its numbers match the lists.
export const ORDER_FILTER_CONDITIONS: Record<OrderFilter, () => SQL | undefined> = {
  all: () => undefined,
  paid_late: () => eq(orders.status, "paid_late"),
  to_fulfil: () =>
    and(eq(orders.status, "paid"), notInArray(orders.fulfilmentStatus, ["delivered", "collected"])),
  overdue: () => and(eq(orders.status, "pending"), sql`${orders.expiresAt} < now()`),
  pending: () => and(eq(orders.status, "pending"), sql`${orders.expiresAt} >= now()`),
  paid: () => eq(orders.status, "paid"),
  expired: () => eq(orders.status, "expired"),
  cancelled: () => eq(orders.status, "cancelled"),
  refunded: () => eq(orders.status, "refunded"),
};

// Newest first. `after` is the id of the last order on the previous page; the
// database compares its own created_at, which is more precise than a JS Date.
export async function listOrdersForAdmin({
  filter,
  query,
  after,
}: {
  filter: OrderFilter;
  query: string;
  after?: string;
}) {
  await requireAdmin("/admin/orders");

  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      fulfilmentStatus: orders.fulfilmentStatus,
      delivery: orders.delivery,
      totalCents: orders.totalCents,
      receiverName: orders.receiverName,
      email: orders.email,
      createdAt: orders.createdAt,
      overdue: sql<boolean>`${orders.status} = 'pending' and ${orders.expiresAt} < now()`,
      itemCount: sql<number>`(
        select coalesce(sum(oi.quantity), 0)::int from ${orderItems} oi where oi.order_id = ${orders.id}
      )`,
    })
    .from(orders)
    .innerJoin(user, eq(orders.userId, user.id))
    .where(
      and(
        ORDER_FILTER_CONDITIONS[filter](),
        query
          ? or(
              ilike(orders.reference, pattern),
              ilike(orders.email, pattern),
              ilike(user.email, pattern),
            )
          : undefined,
        after
          ? sql`(${orders.createdAt}, ${orders.id}) < (
              select o.created_at, o.id from ${orders} o where o.id = ${after}::uuid
            )`
          : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(PAGE_SIZE + 1);

  return {
    orders: rows.slice(0, PAGE_SIZE),
    nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getOrderForAdmin(id: string) {
  await requireAdmin(`/admin/orders/${id}`);

  if (!isUuid(id)) return undefined;
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    columns: { khqr: false },
    with: {
      items: { orderBy: orderItems.createdAt },
      user: { columns: { name: true, email: true } },
      events: {
        orderBy: desc(orderEvents.createdAt),
        with: { actor: { columns: { name: true, email: true } } },
      },
    },
  });
}

// Fulfilment steps by delivery method, in order
export const FULFILMENT_STEPS = {
  delivery: ["unfulfilled", "processing", "shipped", "delivered"],
  pickup: ["unfulfilled", "processing", "ready_for_pickup", "collected"],
} as const satisfies Record<string, readonly FulfilmentStatus[]>;

export function fulfilmentNeighbours(delivery: "delivery" | "pickup", current: FulfilmentStatus) {
  const steps: readonly FulfilmentStatus[] = FULFILMENT_STEPS[delivery];
  const index = steps.indexOf(current);
  return {
    next: index >= 0 ? steps[index + 1] : undefined,
    previous: index > 0 ? steps[index - 1] : undefined,
  };
}

// The pieces have left the store, so their stock doesn't return by itself
export function hasLeftStore(status: FulfilmentStatus) {
  return status === "shipped" || status === "delivered" || status === "collected";
}

async function findOrder(id: string) {
  const order = isUuid(id) ? await db.query.orders.findFirst({ where: eq(orders.id, id) }) : undefined;
  if (!order) throw new OrderActionError("This order no longer exists.");
  return order;
}

// Appended to a statement with a `claimed` CTE that returns the changed order's id
function logEvent(event: {
  actorId: string;
  from: string;
  to: string;
  reason: string | null;
  stockChanged: boolean;
}) {
  return sql`
    logged as (
      insert into ${orderEvents} (order_id, actor_id, from_status, to_status, reason, stock_changed)
      select id, ${event.actorId}::text, ${event.from}::text, ${event.to}::text, ${event.reason}::text, ${event.stockChanged}::boolean
      from claimed
      returning id
    )
  `;
}

// One Bakong lookup per click. Clearing the customer's bag stays in their own action.
export async function recheckOrderPayment(id: string): Promise<{
  before: "pending" | "expired" | "cancelled";
  result: PaymentCheck;
}> {
  await requireAdmin();

  const order = await findOrder(id);
  if (order.status !== "pending" && order.status !== "expired" && order.status !== "cancelled") {
    throw new OrderChangedError();
  }
  return { before: order.status, result: await settleOrder(order) };
}

export async function updateFulfilment(
  id: string,
  from: FulfilmentStatus,
  to: FulfilmentStatus,
  trackingReference: string | null,
) {
  const { user: admin } = await requireAdmin();

  const order = await findOrder(id);
  if (order.status !== "paid") throw new OrderChangedError();
  const { next, previous } = fulfilmentNeighbours(order.delivery, from);
  if (to !== next && to !== previous) throw new OrderChangedError();

  const result = await db.execute(sql`
    with claimed as (
      update ${orders}
      set fulfilment_status = ${to}::fulfilment_status,
          tracking_reference = coalesce(${trackingReference}::text, tracking_reference),
          updated_at = now()
      where id = ${id}::uuid and status = 'paid' and fulfilment_status = ${from}::fulfilment_status
      returning id
    ), ${logEvent({ actorId: admin.id, from, to, reason: null, stockChanged: false })}
    select id from claimed
  `);
  if (result.rows.length === 0) throw new OrderChangedError();
}

// The payment is good but its QR expired, so its stock went back: take it again,
// all or nothing. Running out leaves the order as it is, for a refund instead.
export async function acceptLatePayment(id: string, reason: string | null) {
  const { user: admin } = await requireAdmin();

  const outOfStock = new OrderActionError(
    "There isn't enough stock left to accept this order. Refund it or add stock first.",
  );
  let result;
  try {
    result = await db.execute(sql`
      with wanted as (
        select product_id, sum(quantity)::int as quantity
        from ${orderItems}
        where order_id = ${id}::uuid
        group by product_id
      ), claimed as (
        update ${orders} set status = 'paid', updated_at = now()
        where id = ${id}::uuid and status = 'paid_late' and not exists (
          select 1 from wanted w join ${products} p on p.id = w.product_id where p.stock < w.quantity
        )
        returning id
      ), reserved as (
        update ${products} p
        set stock = p.stock - w.quantity, updated_at = now()
        from wanted w
        where p.id = w.product_id and exists (select 1 from claimed)
        returning p.id
      ), ${logEvent({ actorId: admin.id, from: "paid_late", to: "paid", reason, stockChanged: true })}
      select id from claimed
    `);
  } catch (error) {
    // A checkout took the last pieces after the check above; the CHECK undid everything
    if (isStockViolation(error)) throw outOfStock;
    throw error;
  }

  if (result.rows.length === 0) {
    const order = await findOrder(id);
    throw order.status === "paid_late" ? outOfStock : new OrderChangedError();
  }
  revalidateTag("products", "max");
}

// Releases the order's stock in the same statement as the status change. Only
// the request that wins the update releases anything.
function releaseStock(restock: boolean) {
  return sql`
    released as (
      select product_id, sum(quantity)::int as quantity
      from ${orderItems}
      where ${restock}::boolean and order_id in (select id from claimed)
      group by product_id
    ), restocked as (
      update ${products} p
      set stock = p.stock + released.quantity, updated_at = now()
      from released
      where p.id = released.product_id
      returning p.id
    )
  `;
}

// Asks Bakong first. A payment found isn't cancelled: the result says what
// happened instead. `null` means the order was cancelled.
export async function cancelPendingOrder(id: string, reason: string): Promise<PaymentCheck | null> {
  const { user: admin } = await requireAdmin();

  const order = await findOrder(id);
  if (order.status !== "pending") throw new OrderChangedError();

  const check = await settleOrder(order);
  if (check.status !== "pending") return check;

  const result = await db.execute(sql`
    with claimed as (
      update ${orders} set status = 'cancelled', updated_at = now()
      where id = ${id}::uuid and status = 'pending'
      returning id
    ), ${releaseStock(true)},
    ${logEvent({ actorId: admin.id, from: "pending", to: "cancelled", reason, stockChanged: true })}
    select id from claimed
  `);
  if (result.rows.length === 0) throw new OrderChangedError();
  revalidateTag("products", "max");
  return null;
}

// Stock: paid_late already gave its stock back, so nothing returns. A paid order
// still in the store returns it. Once it has left, staff choose (`restock`).
export async function recordRefund(
  id: string,
  refund: { reference: string; amountCents: number; reason: string; restock: boolean },
) {
  const { user: admin } = await requireAdmin();

  const order = await findOrder(id);
  if (order.status !== "paid" && order.status !== "paid_late") {
    throw new OrderChangedError();
  }
  const paidCents = order.paidAmountCents ?? order.totalCents;
  if (refund.amountCents > paidCents) {
    throw new OrderActionError("The refund can't be more than the amount paid.");
  }
  const restock =
    order.status === "paid" && (!hasLeftStore(order.fulfilmentStatus) || refund.restock);

  const result = await db.execute(sql`
    with claimed as (
      update ${orders}
      set status = 'refunded',
          refunded_at = now(),
          refund_reference = ${refund.reference}::text,
          refund_amount_cents = ${refund.amountCents}::int,
          updated_at = now()
      where id = ${id}::uuid
        and status = ${order.status}::order_status
        and fulfilment_status = ${order.fulfilmentStatus}::fulfilment_status
      returning id
    ), ${releaseStock(restock)},
    ${logEvent({ actorId: admin.id, from: order.status, to: "refunded", reason: refund.reason, stockChanged: restock })}
    select id from claimed
  `);
  if (result.rows.length === 0) throw new OrderChangedError();
  if (restock) revalidateTag("products", "max");
}
