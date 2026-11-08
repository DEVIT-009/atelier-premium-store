// Staff access to the catalogue. Every function checks the role itself, reads are
// never cached and every write refreshes the storefront straight away.
import { and, desc, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { categories, orderItems, orders, products, stockMovements } from "@/db/schema";
import { isUuid, requireAdmin } from "@/lib/admin";
import { softDeleteProductImage } from "@/lib/product-images";
import { LOW_STOCK_THRESHOLD } from "@/lib/products";

export type ProductStatus = typeof products.$inferSelect.status;
export type StockReason = typeof stockMovements.$inferSelect.reason;

// A direction means the reason only makes sense that way round
export const STOCK_REASONS: readonly { value: StockReason; label: string; direction?: "add" | "remove" }[] = [
  { value: "received", label: "Received new stock", direction: "add" },
  { value: "returned", label: "Returned to the store", direction: "add" },
  { value: "damaged", label: "Damaged", direction: "remove" },
  { value: "lost", label: "Lost or stolen", direction: "remove" },
  { value: "correction", label: "Count correction" },
  { value: "other", label: "Other (explain in the note)" },
];

export const DEPARTMENTS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex (listed under both)" },
] as const;

// Must match images.remotePatterns in next.config.ts: next/image throws on any
// other host, which would break the store page showing the product
export const IMAGE_HOSTS = ["images.unsplash.com"];

export type ProductFields = {
  name: string;
  description: string;
  details: string[];
  priceCents: number;
  categoryId: string;
  department: "women" | "men" | "unisex";
  badge: string | null;
  imageUrl: string;
  imageAlt: string;
};

// Thrown when an action can't apply; the message is safe to show to staff
export class ProductActionError extends Error {}

// The product moved on since staff loaded the page, so the form may be gone too
export class ProductChangedError extends Error {}

// Shown at the top of a page after an action redirects back to it
export const PRODUCT_NOTICES = {
  created: { tone: "success", message: "Product created." },
  saved: { tone: "success", message: "Changes saved." },
  active: { tone: "success", message: "The product is on sale in the store." },
  draft: { tone: "muted", message: "The product is now a draft and is off the store." },
  archived: { tone: "muted", message: "The product is archived and is off the store. Its order history is kept." },
  deleted: { tone: "muted", message: "Product deleted." },
  stock: { tone: "success", message: "Stock updated." },
  changed: { tone: "error", message: "This product just changed. Review it and try again." },
} as const;

export type ProductNotice = keyof typeof PRODUCT_NOTICES;

const PAGE_SIZE = 25;
const HISTORY_SIZE = 50;

export const PRODUCT_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
  { value: "low_stock", label: "Low stock" },
] as const;

export type ProductFilter = (typeof PRODUCT_FILTERS)[number]["value"];

// The dashboard counts with these too, so its numbers match the lists. Low stock
// is what the store labels "Only N left" or "Sold out", on sale only.
export const PRODUCT_FILTER_CONDITIONS: Record<ProductFilter, () => SQL | undefined> = {
  all: () => undefined,
  active: () => eq(products.status, "active"),
  draft: () => eq(products.status, "draft"),
  archived: () => eq(products.status, "archived"),
  low_stock: () => and(eq(products.status, "active"), lte(products.stock, LOW_STOCK_THRESHOLD)),
};

// Newest first. `after` is the id of the last product on the previous page; the
// database compares its own created_at, which is more precise than a JS Date.
export async function listProductsForAdmin({
  filter,
  query,
  after,
}: {
  filter: ProductFilter;
  query: string;
  after?: string;
}) {
  await requireAdmin("/admin/products");

  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const conditions: (SQL | undefined)[] = [
    PRODUCT_FILTER_CONDITIONS[filter](),
    query ? or(ilike(products.name, pattern), ilike(products.slug, pattern)) : undefined,
    after
      ? sql`(${products.createdAt}, ${products.id}) < (
          select p.created_at, p.id from ${products} p where p.id = ${after}::uuid
        )`
      : undefined,
  ];
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      status: products.status,
      priceCents: products.priceCents,
      stock: products.stock,
      imageUrl: products.imageUrl,
      imageAlt: products.imageAlt,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(PAGE_SIZE + 1);

  return {
    products: rows.slice(0, PAGE_SIZE),
    nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getProductForAdmin(id: string) {
  await requireAdmin(`/admin/products/${id}`);

  if (!isUuid(id)) return undefined;
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return undefined;

  const [[{ orderLines, held }], movements] = await Promise.all([
    db
      .select({
        orderLines: sql<number>`count(*)::int`,
        // Overdue QRs count until expiry runs: their units haven't gone back yet
        held: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.status} = 'pending'), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.productId, id)),
    db.query.stockMovements.findMany({
      where: eq(stockMovements.productId, id),
      with: { actor: { columns: { email: true } } },
      orderBy: [desc(stockMovements.createdAt), desc(stockMovements.id)],
      limit: HISTORY_SIZE + 1,
    }),
  ]);
  return {
    ...product,
    orderLines,
    held,
    movements: movements.slice(0, HISTORY_SIZE),
    hasOlderMovements: movements.length > HISTORY_SIZE,
  };
}

export async function listCategoriesForAdmin() {
  await requireAdmin("/admin/products");

  return db
    .select({ value: categories.id, label: categories.name })
    .from(categories)
    .orderBy(categories.name);
}

// Postgres reports the violated rule as a code, somewhere in the error's causes
function hasPgCode(error: unknown, code: string) {
  for (let e = error; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === code) return true;
  }
  return false;
}
const FOREIGN_KEY_VIOLATION = "23503";
// What Postgres 18 reports for a delete blocked by ON DELETE RESTRICT; older
// versions report a plain foreign key violation
const RESTRICT_VIOLATION = "23001";

export function isStillReferenced(error: unknown) {
  return hasPgCode(error, RESTRICT_VIOLATION) || hasPgCode(error, FOREIGN_KEY_VIOLATION);
}

function rethrowMissingCategory(error: unknown): never {
  if (hasPgCode(error, FOREIGN_KEY_VIOLATION)) {
    throw new ProductActionError("That category no longer exists. Choose another.");
  }
  throw error;
}

// The current image URL, or undefined if the product is gone
export async function getProductImageUrl(id: string) {
  await requireAdmin();

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    columns: { imageUrl: true },
  });
  return product?.imageUrl;
}

// Returns the new id, or null if the slug is already taken. The id is chosen by
// the caller because an uploaded image is named after it.
export async function createProduct(
  fields: ProductFields & { id: string; slug: string; stock: number; status: "draft" | "active" },
) {
  await requireAdmin();

  const rows = await db
    .insert(products)
    .values(fields)
    .onConflictDoNothing({ target: products.slug })
    .returning({ id: products.id })
    .catch(rethrowMissingCategory);
  if (rows.length === 0) return null;

  updateTag("products");
  return rows[0].id;
}

// Never writes stock or slug. Orders keep their own copies of name and price.
export async function updateProduct(id: string, fields: ProductFields) {
  await requireAdmin();

  const rows = await db
    .update(products)
    .set(fields)
    .where(eq(products.id, id))
    .returning({ id: products.id })
    .catch(rethrowMissingCategory);
  if (rows.length === 0) throw new ProductChangedError();

  updateTag("products");
}

// Stock is left alone: reserved units stay with their orders, and a QR already
// issued still settles. The last active product stays, because
// generateStaticParams needs at least one param or `next build` fails.
export async function setProductStatus(id: string, from: ProductStatus, to: ProductStatus) {
  await requireAdmin();

  const rows = await db
    .update(products)
    .set({ status: to })
    .where(
      and(
        eq(products.id, id),
        eq(products.status, from),
        from === "active"
          ? sql`exists (select 1 from ${products} p where p.status = 'active' and p.id <> ${id}::uuid)`
          : undefined,
      ),
    )
    .returning({ id: products.id });

  if (rows.length === 0) {
    const current = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { status: true },
    });
    if (current?.status === "active" && from === "active") {
      throw new ProductActionError("This is the last active product. Publish another one first.");
    }
    throw new ProductChangedError();
  }
  updateTag("products");
}

// Adds or removes units in one statement with its history row, so the two can't
// disagree. `delta` is relative: a checkout at the same moment isn't overwritten,
// and units held by unpaid QR codes aren't in `stock`, so they can't be removed.
export async function adjustStock(id: string, delta: number, reason: StockReason, note: string | null) {
  const { user: admin } = await requireAdmin();

  const result = await db.execute(sql`
    with changed as (
      update ${products} set stock = stock + ${delta}::int, updated_at = now()
      where id = ${id}::uuid and stock + ${delta}::int >= 0
      returning id, stock
    )
    insert into ${stockMovements} (product_id, delta, stock_after, reason, note, actor_id)
    select id, ${delta}::int, stock, ${reason}::stock_movement_reason, ${note}::text, ${admin.id}::text
    from changed
    returning id
  `);

  if (result.rows.length === 0) {
    const current = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { stock: true },
    });
    if (!current) throw new ProductChangedError();
    throw new ProductActionError(
      `Only ${current.stock} available to remove. Units held by unpaid QR codes can't be removed.`,
    );
  }
  updateTag("products");
}

// Only for products off the store, never ordered and with no stock history. The
// foreign keys are what guarantee it: an order placed just now still blocks this.
export async function deleteProduct(id: string) {
  await requireAdmin();

  const blocked = new ProductActionError(
    "This product has orders or stock history, so it can't be deleted. Archive it instead.",
  );
  const rows = await db
    .delete(products)
    .where(
      and(
        eq(products.id, id),
        sql`${products.status} <> 'active'`,
        sql`not exists (select 1 from ${orderItems} oi where oi.product_id = ${id}::uuid)`,
        sql`not exists (select 1 from ${stockMovements} sm where sm.product_id = ${id}::uuid)`,
      ),
    )
    .returning({ id: products.id })
    .catch((error: unknown) => {
      if (isStillReferenced(error)) throw blocked;
      throw error;
    });

  if (rows.length === 0) {
    const current = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { status: true },
    });
    if (!current || current.status === "active") throw new ProductChangedError();
    throw blocked;
  }
  updateTag("products");

  // The product is gone by now, so a problem with its file mustn't report failure
  await softDeleteProductImage(id).catch((error: unknown) => {
    console.error("Could not move a deleted product's image", { id, error });
  });
}
