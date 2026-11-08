// Orders paid with Bakong KHQR. Payment is checked only when the customer clicks
// "check payment" in the QR dialog, or places an order that would replace an
// earlier QR: nothing polls Bakong.
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import type { BagEntry } from "@/lib/bag";
import { BakongUnavailableError, checkTransactionByMd5 } from "@/lib/khqr/bakong";
import { getKhqrConfig } from "@/lib/khqr/config";
import { buildKhqr, formatKhqrAmount } from "@/lib/khqr/encode";

type OrderRow = typeof orders.$inferSelect;

export type OrderStatus = OrderRow["status"];

export type DeliveryMethod = OrderRow["delivery"];

export type CheckoutDetails = {
  email: string;
  phone: string | null;
  receiverName: string;
  note: string | null;
} & (
  | { delivery: "delivery"; province: string; addressDetail: string }
  | { delivery: "pickup"; province: null; addressDetail: null }
);

// What the QR dialog needs; the KHQR string is safe to show, the token never is
export type PendingPayment = {
  orderId: string;
  reference: string;
  khqr: string;
  total: number; // USD cents
  expiresAt: string; // ISO
};

export type OrderSummary = {
  id: string;
  reference: string;
  status: OrderStatus;
  total: number; // USD cents
  paidAt: Date | null;
  payerAccount: string | null;
  items: { name: string; quantity: number; unitPrice: number }[];
};

export class CheckoutError extends Error {}

// Placing an order found that an earlier QR of this customer was already paid
export class EarlierOrderPaidError extends Error {
  constructor(
    readonly orderId: string,
    readonly sameBag: boolean, // that order holds the pieces now in the bag
  ) {
    super("An earlier order was already paid");
  }
}

// How long after its expiry a QR is still looked up before placing a new order.
// Bounds the Bakong calls per click, along with the limit on orders checked.
const RECHECK_WINDOW_MS = 60 * 60_000;
const RECHECK_MAX_ORDERS = 5;

// 10 characters from an unambiguous alphabet, e.g. "AT7K2M9QXA"
function newReference() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  return "AT" + Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function itemsKey(items: { productId: string; quantity: number }[]) {
  return items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join(",");
}

export function isStockViolation(error: unknown) {
  for (let e = error; e; e = (e as { cause?: unknown }).cause) {
    const { constraint, message } = e as { constraint?: string; message?: string };
    if (constraint === "products_stock_check" || message?.includes("products_stock_check")) {
      return true;
    }
  }
  return false;
}

// Puts reserved stock back for pending orders past their QR expiry (or the
// given ones). A single statement, so it's atomic and safe to run twice.
export async function expireOrders(where: { orderIds?: string[]; userId?: string } = {}) {
  const byIds = where.orderIds
    ? sql`and id in (${sql.join(where.orderIds.map((id) => sql`${id}::uuid`), sql`, `)})`
    : sql`and expires_at < now()`;
  const byUser = where.userId ? sql`and user_id = ${where.userId}` : sql``;

  const result = await db.execute(sql`
    with expired as (
      update ${orders} set status = 'expired', updated_at = now()
      where status = 'pending' ${byIds} ${byUser}
      returning id
    ), released as (
      select product_id, sum(quantity)::int as quantity
      from ${orderItems}
      where order_id in (select id from expired)
      group by product_id
    )
    update ${products} p
    set stock = p.stock + released.quantity, updated_at = now()
    from released
    where p.id = released.product_id
    returning p.id
  `);
  if (result.rows.length > 0) revalidateTag("products", "max");
}

// Units each product has reserved by this customer's unexpired QR codes
export async function getReservedQuantities(userId: string) {
  const rows = await db
    .select({
      productId: orderItems.productId,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "pending"),
        gt(orders.expiresAt, new Date()),
      ),
    )
    .groupBy(orderItems.productId);
  return new Map(rows.map((row) => [row.productId, row.quantity]));
}

// Asks Bakong about the customer's recent QR codes before a new one replaces
// them, so a payment already made is found rather than orphaned or paid twice.
// If Bakong can't answer nothing is released: the customer tries again.
async function settleEarlierOrders(
  earlier: (OrderRow & { items: { productId: string; quantity: number }[] })[],
  bagKey: string,
) {
  let results;
  try {
    results = await Promise.all(earlier.map((order) => settleOrder(order)));
  } catch (error) {
    if (error instanceof BakongUnavailableError) {
      console.error("Bakong check failed", error.message);
      throw new CheckoutError("We couldn't check your earlier payment right now. Please try again in a moment.");
    }
    throw error;
  }

  const paid = earlier.find((_, index) => {
    const { status } = results[index];
    return status === "paid" || status === "paid_late";
  });
  if (paid) throw new EarlierOrderPaidError(paid.id, itemsKey(paid.items) === bagKey);

  const review = earlier.find((_, index) => results[index].status === "review");
  if (review) {
    throw new CheckoutError(
      `We found a payment we couldn't match to order ${review.reference}. Please contact Client Services.`,
    );
  }
}

// Creates a pending order, reserves its stock and builds its KHQR. If the
// customer already has an unexpired QR for the same pieces, that one is reused
// with the latest delivery details: they aren't part of the QR.
export async function createOrder(
  userId: string,
  entries: BagEntry[],
  details: CheckoutDetails,
): Promise<PendingPayment> {
  if (entries.length === 0) throw new CheckoutError("Your bag is empty.");

  await expireOrders(); // housekeeping only: no Bakong call

  const now = new Date();
  const recent = await db.query.orders.findMany({
    where: and(
      eq(orders.userId, userId),
      inArray(orders.status, ["pending", "expired", "cancelled"]),
      gt(orders.expiresAt, new Date(now.getTime() - RECHECK_WINDOW_MS)),
    ),
    with: { items: { columns: { productId: true, quantity: true } } },
    orderBy: desc(orders.expiresAt),
    limit: RECHECK_MAX_ORDERS,
  });
  const open = recent.filter((order) => order.status === "pending" && order.expiresAt > now);
  // This customer's own unexpired reservations count as available: they're
  // either reused below or released before the new order is created
  const reserved = new Map<string, number>();
  for (const item of open.flatMap((order) => order.items)) {
    reserved.set(item.productId, (reserved.get(item.productId) ?? 0) + item.quantity);
  }

  // Fresh prices and stock, not the cached catalogue
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      stock: products.stock,
    })
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        inArray(products.slug, entries.map((entry) => entry.slug)),
      ),
    );
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  // Same rule as the bag summary: products no longer in the catalogue are
  // dropped, the rest buy what's in stock up to the requested quantity
  const items = entries.flatMap((entry) => {
    const product = bySlug.get(entry.slug);
    if (!product) return [];
    const quantity = Math.min(entry.quantity, product.stock + (reserved.get(product.id) ?? 0));
    if (quantity < 1) {
      throw new CheckoutError(`${product.name} has sold out. Please review your bag.`);
    }
    return [{
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity,
    }];
  });
  if (items.length === 0) throw new CheckoutError("Your bag is empty.");
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const total = subtotal; // complimentary shipping, no taxes yet
  if (total <= 0) throw new CheckoutError("Your order total must be above zero.");

  const same = open.find(
    (order) => order.totalCents === total && itemsKey(order.items) === itemsKey(items),
  );
  if (same) {
    const updated = await db
      .update(orders)
      .set(details)
      .where(and(eq(orders.id, same.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (updated.length === 0) {
      throw new CheckoutError("Your order just changed. Please place it again.");
    }
    return {
      orderId: same.id,
      reference: same.reference,
      khqr: same.khqr,
      total: same.totalCents,
      expiresAt: same.expiresAt.toISOString(),
    };
  }

  await settleEarlierOrders(recent, itemsKey(items));
  // A different bag: let go of the older reservations first
  if (open.length > 0) await expireOrders({ orderIds: open.map((order) => order.id), userId });

  const config = getKhqrConfig();
  const reference = newReference();
  const expiresAt = new Date(now.getTime() + config.expirationMinutes * 60_000);
  const { qr, md5 } = buildKhqr({
    accountId: config.accountId,
    merchantName: config.merchantName,
    merchantCity: config.merchantCity,
    mobileNumber: config.merchantPhone,
    storeLabel: config.storeLabel,
    terminalLabel: config.terminalLabel,
    currency: "USD",
    amount: formatKhqrAmount(total, "USD"),
    billNumber: reference,
    createdAtMs: now.getTime(),
    expiresAtMs: expiresAt.getTime(),
  });

  const orderId = randomUUID();
  try {
    // One transaction: the order, its items and the stock reservation. The
    // stock >= 0 CHECK aborts everything if someone else got there first.
    await db.batch([
      db.insert(orders).values({
        id: orderId,
        reference,
        userId,
        subtotalCents: subtotal,
        totalCents: total,
        ...details,
        khqr: qr,
        khqrMd5: md5,
        expiresAt,
      }),
      db.insert(orderItems).values(items.map((item) => ({ orderId, ...item }))),
      ...items.map((item) =>
        db
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId)),
      ),
    ]);
  } catch (error) {
    if (isStockViolation(error)) {
      throw new CheckoutError("A piece in your bag just sold out. Please review your bag.");
    }
    throw error;
  }
  revalidateTag("products", "max");

  return { orderId, reference, khqr: qr, total, expiresAt: expiresAt.toISOString() };
}

// What Bakong reported for a payment that doesn't match its order
export type PaymentMismatch = {
  expected: { account: string; currency: string; cents: number };
  received: { account?: string; currency?: string; cents: number };
};

export type PaymentCheck =
  | { status: "paid"; settledNow: boolean }
  | { status: "review"; mismatch?: PaymentMismatch }
  | { status: "pending" | "expired" | "paid_late" };

// Asks Bakong once whether this order's KHQR was paid. Throws
// BakongUnavailableError if Bakong can't answer; that never marks anything.
export async function checkOrderPayment(orderId: string, userId: string): Promise<PaymentCheck | null> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) return null;
  if (order.status === "paid") return { status: "paid", settledNow: false };
  if (order.status === "paid_late") return { status: "paid_late" };
  if (order.status === "refunded") return { status: "review" };

  return settleOrder(order);
}

// One Bakong lookup for an order that isn't settled yet, marking it if paid.
// A cancelled QR can still be scanned, so a payment on one is kept for staff.
export async function settleOrder(order: OrderRow): Promise<PaymentCheck> {
  const result = await checkTransactionByMd5(order.khqrMd5);

  if (!result.paid) {
    if (order.status === "pending" && order.expiresAt <= new Date()) {
      await expireOrders({ orderIds: [order.id] });
      return { status: "expired" };
    }
    return { status: order.status === "pending" ? "pending" : "expired" };
  }

  // Never trust a payment that doesn't match this order exactly
  const { transaction } = result;
  const { accountId } = getKhqrConfig();
  const paidCents = Math.round(Number(transaction.amount) * 100);
  if (
    transaction.toAccountId?.toLowerCase() !== accountId.toLowerCase() ||
    transaction.currency?.toUpperCase() !== "USD" ||
    paidCents !== order.totalCents
  ) {
    const mismatch: PaymentMismatch = {
      expected: { account: accountId, currency: "USD", cents: order.totalCents },
      received: {
        account: transaction.toAccountId,
        currency: transaction.currency,
        cents: paidCents,
      },
    };
    console.error("KHQR payment does not match order", {
      orderId: order.id,
      reference: order.reference,
      ...mismatch,
    });
    return { status: "review", mismatch };
  }

  const payment = {
    paidAt: new Date(transaction.acknowledgedDateMs ?? Date.now()),
    bakongHash: transaction.hash,
    payerAccount: transaction.fromAccountId ?? null,
    paidAmountCents: paidCents,
  };

  // Conditional transitions: only one click (or tab) can settle the order
  const settled = await db
    .update(orders)
    .set({ status: "paid", ...payment })
    .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (settled.length > 0) return { status: "paid", settledNow: true };

  // Its stock was already released: staff decide whether to fulfil or refund
  const late = await db
    .update(orders)
    .set({ status: "paid_late", ...payment })
    .where(and(eq(orders.id, order.id), inArray(orders.status, ["expired", "cancelled"])))
    .returning({ id: orders.id });
  if (late.length > 0) {
    console.error("KHQR paid after expiry", { orderId: order.id, reference: order.reference });
    return { status: "paid_late" };
  }

  const current = await db.query.orders.findFirst({
    where: eq(orders.id, order.id),
    columns: { status: true },
  });
  return current?.status === "paid"
    ? { status: "paid", settledNow: false }
    : { status: current?.status === "paid_late" ? "paid_late" : "review" };
}

export async function getOrderForUser(orderId: string, userId: string): Promise<OrderSummary | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return undefined;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    with: { items: true },
  });
  if (!order) return undefined;

  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total: order.totalCents,
    paidAt: order.paidAt,
    payerAccount: order.payerAccount,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPriceCents,
    })),
  };
}
