import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";

// pending → paid when the customer's "check payment" click finds the KHQR paid;
// pending → expired once the QR lifetime passes (reserved stock goes back);
// expired → paid_late when a click finds a payment for an expired QR (needs staff)
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "paid_late",
]);

// delivery: couriered to province + address; pickup: collected in store
export const deliveryMethod = pgEnum("delivery_method", ["delivery", "pickup"]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Bill number inside the KHQR (tag 62/01), shown to the customer
    reference: text("reference").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").default("pending").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").default(0).notNull(),
    totalCents: integer("total_cents").notNull(),

    email: text("email").notNull(),
    phone: text("phone"),
    receiverName: text("receiver_name").notNull(),
    delivery: deliveryMethod("delivery").notNull(),
    // Required for delivery, null for pickup (see orders_delivery_address_check)
    province: text("province"),
    addressDetail: text("address_detail"),
    note: text("note"),

    // The exact string shown as the QR; its MD5 is how Bakong finds the payment
    khqr: text("khqr").notNull(),
    khqrMd5: text("khqr_md5").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Filled from Bakong's check_transaction_by_md5 response
    paidAt: timestamp("paid_at", { withTimezone: true }),
    bakongHash: text("bakong_hash").unique(), // one bank transaction settles one order
    payerAccount: text("payer_account"),
    paidAmountCents: integer("paid_amount_cents"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_expires_at_idx").on(table.status, table.expiresAt),
    check("orders_subtotal_cents_check", sql`${table.subtotalCents} >= 0`),
    check("orders_shipping_cents_check", sql`${table.shippingCents} >= 0`),
    check("orders_total_cents_check", sql`${table.totalCents} > 0`),
    check(
      "orders_delivery_address_check",
      sql`${table.delivery} = 'pickup' or (${table.province} is not null and ${table.addressDetail} is not null)`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // Snapshots: the order keeps what the customer was charged
    productName: text("product_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_unit_price_cents_check", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
