import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
// expired or cancelled → paid_late when a check finds a payment anyway (needs staff);
// paid_late → paid when staff accept it and stock can be reserved again;
// pending → cancelled by staff (stock goes back);
// paid or paid_late → refunded once staff have sent the money back
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "paid_late",
  "cancelled",
  "refunded",
]);

// Only moves while an order is paid. Delivery: processing → shipped → delivered.
// Pickup: processing → ready_for_pickup → collected.
export const fulfilmentStatus = pgEnum("fulfilment_status", [
  "unfulfilled",
  "processing",
  "shipped",
  "delivered",
  "ready_for_pickup",
  "collected",
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

    fulfilmentStatus: fulfilmentStatus("fulfilment_status").default("unfulfilled").notNull(),
    trackingReference: text("tracking_reference"),

    // Refunds are bank transfers made by hand; these only record them
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundReference: text("refund_reference"),
    refundAmountCents: integer("refund_amount_cents"),

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
    index("orders_created_at_id_idx").on(table.createdAt, table.id),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    check("orders_subtotal_cents_check", sql`${table.subtotalCents} >= 0`),
    check("orders_shipping_cents_check", sql`${table.shippingCents} >= 0`),
    check("orders_total_cents_check", sql`${table.totalCents} > 0`),
    check("orders_refund_amount_cents_check", sql`${table.refundAmountCents} > 0`),
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

// What staff did to an order, written in the same statement as the change
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // An order_status or fulfilment_status value, depending on what changed
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    reason: text("reason"),
    stockChanged: boolean("stock_changed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("order_events_order_id_idx").on(table.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actor: one(user, { fields: [orderEvents.actorId], references: [user.id] }),
}));
