// Staff access to categories. Every function checks the role itself, reads are
// never cached and every write refreshes the storefront straight away.
import { asc, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { isStillReferenced } from "@/lib/admin-products";

// A category page lives at /<slug>, and any of these paths would win over it
export const RESERVED_CATEGORY_SLUGS = new Set([
  // Routes in src/app and src/pages
  "400", "404", "500", "account", "admin", "api", "bag", "checkout", "journal",
  "men", "new-in", "products", "sign-in", "sign-up", "women",
  // public/ folder, and pages the store header already links to
  "assets", "client-services", "search",
]);

// Thrown when a delete can't apply; the message is safe to show to staff
export class CategoryActionError extends Error {}

// The category is gone since staff loaded the page
export class CategoryChangedError extends Error {}

// Shown at the top of the page after an action redirects back to it
export const CATEGORY_NOTICES = {
  created: { tone: "success", message: "Category created." },
  saved: { tone: "success", message: "Category saved." },
  deleted: { tone: "muted", message: "Category deleted." },
  changed: { tone: "error", message: "That category no longer exists." },
} as const;

export type CategoryNotice = keyof typeof CATEGORY_NOTICES;

export async function listCategoriesWithCounts() {
  await requireAdmin("/admin/categories");

  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      position: categories.position,
      showInMenu: categories.showInMenu,
      showOnHome: categories.showOnHome,
      updatedAt: categories.updatedAt,
      productCount: sql<number>`count(${products.id})::int`,
      activeCount: sql<number>`(count(${products.id}) filter (where ${products.status} = 'active'))::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    // The store's order
    .orderBy(asc(categories.position), asc(categories.name));
}

// Returns false if the slug is already taken. A new category goes last, and
// isn't in the store's menu or on its homepage until staff choose.
export async function createCategory(fields: { name: string; slug: string }) {
  await requireAdmin();

  const rows = await db
    .insert(categories)
    .values({
      ...fields,
      position: sql`(select coalesce(max(${categories.position}), 0) + 1 from ${categories})`,
    })
    .onConflictDoNothing({ target: categories.slug })
    .returning({ id: categories.id });
  if (rows.length === 0) return false;

  updateTag("products");
  return true;
}

// Never writes the slug: it's the category's URL
export async function updateCategory(
  id: string,
  fields: { name: string; position: number; showInMenu: boolean; showOnHome: boolean },
) {
  await requireAdmin();

  const rows = await db
    .update(categories)
    .set(fields)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (rows.length === 0) throw new CategoryChangedError();

  updateTag("products");
}

// The foreign key from products is what guarantees a category in use stays: a
// product added just now still blocks this. The last category can't go either,
// because the last active product can't leave `active`.
export async function deleteCategory(id: string) {
  await requireAdmin();

  const blocked = new CategoryActionError(
    "This category has products, including any drafts or archived ones. Move them to another category first.",
  );
  const rows = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id })
    .catch((error: unknown) => {
      if (isStillReferenced(error)) throw blocked;
      throw error;
    });
  if (rows.length === 0) throw new CategoryChangedError();

  updateTag("products");
}
