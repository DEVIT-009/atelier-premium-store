// The admin overview. Read-only and never cached, and it never asks Bakong:
// payments are only checked when staff click. Each count uses the same
// condition as the list it links to, so the numbers match.
import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, user } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { ORDER_FILTER_CONDITIONS } from "@/lib/admin-orders";
import { PRODUCT_FILTER_CONDITIONS } from "@/lib/admin-products";
import { USER_FILTER_CONDITIONS } from "@/lib/admin-users";

// Store time, like every date the admin shows
const STORE_TIME_ZONE = "Asia/Phnom_Penh";

const countOrders = (where: SQL | undefined) => db.select({ n: count() }).from(orders).where(where);

// Orders accepted as paid, by when they were paid. Late, cancelled and refunded
// orders aren't sales; a late payment counts once staff accept it.
function sales(since: SQL) {
  return db
    .select({
      orders: count(),
      cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.paidAt, since)));
}

export async function getDashboard() {
  await requireAdmin("/admin");

  const [late, toFulfil, overdue, lowStock, soldOut, today, week, month, customers, newCustomers] =
    await db.batch([
      countOrders(ORDER_FILTER_CONDITIONS.paid_late()),
      countOrders(ORDER_FILTER_CONDITIONS.to_fulfil()),
      countOrders(ORDER_FILTER_CONDITIONS.overdue()),
      db.select({ n: count() }).from(products).where(PRODUCT_FILTER_CONDITIONS.low_stock()),
      db
        .select({ n: count() })
        .from(products)
        .where(and(PRODUCT_FILTER_CONDITIONS.low_stock(), eq(products.stock, 0))),
      // Midnight in the store's time zone, not the server's
      sales(sql`(date_trunc('day', now() at time zone ${STORE_TIME_ZONE}) at time zone ${STORE_TIME_ZONE})`),
      sales(sql`now() - interval '7 days'`),
      sales(sql`now() - interval '30 days'`),
      db.select({ n: count() }).from(user).where(USER_FILTER_CONDITIONS.customers()),
      db
        .select({ n: count() })
        .from(user)
        .where(and(USER_FILTER_CONDITIONS.customers(), sql`${user.createdAt} >= now() - interval '7 days'`)),
    ]);

  return {
    latePayments: late[0].n,
    toFulfil: toFulfil[0].n,
    overdue: overdue[0].n,
    lowStock: lowStock[0].n,
    soldOut: soldOut[0].n,
    sales: { today: today[0], week: week[0], month: month[0] },
    customers: customers[0].n,
    newCustomers: newCustomers[0].n,
  };
}
