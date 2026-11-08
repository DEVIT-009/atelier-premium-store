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

// Only active products are on the storefront or can be bought. Archived ones
// keep their order history; a draft hasn't been on sale yet.
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

export const stockMovementReason = pgEnum("stock_movement_reason", [
  "received",
  "returned",
  "damaged",
  "lost",
  "correction",
  "other",
]);

// The store's menu and homepage list the categories staff choose, lowest
// position first. One with nothing on sale is left out of both.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    position: integer("position").default(0).notNull(),
    showInMenu: boolean("show_in_menu").default(false).notNull(),
    showOnHome: boolean("show_on_home").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [check("categories_position_check", sql`${table.position} >= 0`)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    details: text("details")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    priceCents: integer("price_cents").notNull(), // USD cents
    stock: integer("stock").default(0).notNull(), // 0 = sold out
    imageUrl: text("image_url").notNull(),
    imageAlt: text("image_alt").notNull(),
    badge: text("badge"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    department: text("department").default("unisex").notNull(), // women | men | unisex (listed under both)
    status: productStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_created_at_idx").on(table.createdAt),
    index("products_status_created_at_idx").on(table.status, table.createdAt),
    check("products_price_cents_check", sql`${table.priceCents} >= 0`),
    check("products_stock_check", sql`${table.stock} >= 0`),
    check(
      "products_department_check",
      sql`${table.department} IN ('women', 'men', 'unisex')`,
    ),
  ],
);

// Stock changes made by staff, written in the same statement as the change.
// Orders move stock too and aren't recorded here: their items are the record.
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    stockAfter: integer("stock_after").notNull(),
    reason: stockMovementReason("reason").notNull(),
    note: text("note"),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_movements_product_id_created_at_idx").on(table.productId, table.createdAt),
    check("stock_movements_delta_check", sql`${table.delta} <> 0`),
    check("stock_movements_stock_after_check", sql`${table.stockAfter} >= 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  actor: one(user, { fields: [stockMovements.actorId], references: [user.id] }),
}));
