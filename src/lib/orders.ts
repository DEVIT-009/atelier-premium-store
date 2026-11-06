// Orders paid with Bakong KHQR. Payment is checked only when the customer
// clicks "check payment" in the QR dialog: nothing polls Bakong.
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import type { BagEntry } from "@/lib/bag";
import { checkTransactionByMd5 } from "@/lib/khqr/bakong";
import { getKhqrConfig } from "@/lib/khqr/config";
import { buildKhqr, formatKhqrAmount } from "@/lib/khqr/encode";

export type OrderStatus = (typeof orders.$inferSelect)["status"];

export type DeliveryMethod = (typeof orders.$inferSelect)["delivery"];

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

function isStockViolation(error: unknown) {
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
async function expireOrders(where: { orderIds?: string[]; userId?: string } = {}) {
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

// Creates a pending order, reserves its stock and builds its KHQR. If the
// customer already has an unexpired QR for the same pieces, that one is reused
// so a payment already made to it can't be orphaned.
export async function createOrder(
  userId: string,
  entries: BagEntry[],
  details: CheckoutDetails,
): Promise<PendingPayment> {
  if (entries.length === 0) throw new CheckoutError("Your bag is empty.");

  await expireOrders(); // housekeeping only: no Bakong call

  const now = new Date();
  const open = await db.query.orders.findMany({
    where: and(
      eq(orders.userId, userId),
      eq(orders.status, "pending"),
      gt(orders.expiresAt, now),
    ),
    with: { items: { columns: { productId: true, quantity: true } } },
  });
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
    .where(inArray(products.slug, entries.map((entry) => entry.slug)));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  // Same rule as the bag summary: buy what's in stock, up to the requested quantity
  const items = entries.map((entry) => {
    const product = bySlug.get(entry.slug);
    if (!product) throw new CheckoutError("A piece in your bag is no longer available.");
    const quantity = Math.min(entry.quantity, product.stock + (reserved.get(product.id) ?? 0));
    if (quantity < 1) {
      throw new CheckoutError(`${product.name} has sold out. Please review your bag.`);
    }
    return {
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const total = subtotal; // complimentary shipping, no taxes yet
  if (total <= 0) throw new CheckoutError("Your order total must be above zero.");

  const same = open.find(
    (order) => order.totalCents === total && itemsKey(order.items) === itemsKey(items),
  );
  if (same) {
    return {
      orderId: same.id,
      reference: same.reference,
      khqr: same.khqr,
      total: same.totalCents,
      expiresAt: same.expiresAt.toISOString(),
    };
  }
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

export type PaymentCheck =
  | { status: "paid"; settledNow: boolean }
  | { status: "pending" | "expired" | "paid_late" | "review" };

// Asks Bakong once whether this order's KHQR was paid. Throws
// BakongUnavailableError if Bakong can't answer; that never marks anything.
export async function checkOrderPayment(orderId: string, userId: string): Promise<PaymentCheck | null> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) return null;
  if (order.status === "paid") return { status: "paid", settledNow: false };
  if (order.status === "paid_late") return { status: "paid_late" };

  const result = await checkTransactionByMd5(order.khqrMd5);

  if (!result.paid) {
    if (order.status === "pending" && order.expiresAt <= new Date()) {
      await expireOrders({ orderIds: [order.id] });
      return { status: "expired" };
    }
    return { status: order.status === "expired" ? "expired" : "pending" };
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
    console.error("KHQR payment does not match order", {
      orderId: order.id,
      reference: order.reference,
      expected: { accountId, currency: "USD", cents: order.totalCents },
      received: {
        toAccountId: transaction.toAccountId,
        currency: transaction.currency,
        cents: paidCents,
      },
    });
    return { status: "review" };
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
    .where(and(eq(orders.id, order.id), eq(orders.status, "expired")))
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
