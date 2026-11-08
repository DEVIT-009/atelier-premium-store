// Loads the initial catalogue. Safe to re-run: only slugs that don't exist yet
// are inserted, so live stock, prices and edits are never overwritten.
// Usage: npm run db:seed
import { inArray } from "drizzle-orm";
import { db } from "./index";
import { categories, products } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

async function main() {
  const insertedCategories = await db
    .insert(categories)
    .values(seedCategories)
    .onConflictDoNothing({ target: categories.slug })
    .returning({ id: categories.id });

  // Read back rather than using returning: it skips rows that already existed
  const allCategories = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, seedCategories.map((c) => c.slug)));
  const categoryIds = new Map(allCategories.map((c) => [c.slug, c.id]));

  // Stagger created_at so "New In" (newest first) keeps the listed order
  const now = Date.now();
  const rows = seedProducts.map((product, index) => {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) {
      throw new Error(`Unknown category "${product.category}" for ${product.slug}`);
    }
    return {
      slug: product.slug,
      name: product.name,
      description: product.description,
      details: product.details,
      priceCents: product.price,
      stock: product.stock,
      imageUrl: product.image.src,
      imageAlt: product.image.alt,
      badge: product.badge ?? null,
      categoryId,
      department: product.department,
      createdAt: new Date(now - index * 1000),
    };
  });

  // One multi-row statement, so the products load atomically
  const insertedProducts = await db
    .insert(products)
    .values(rows)
    .onConflictDoNothing({ target: products.slug })
    .returning({ id: products.id });

  console.log(
    `Added ${insertedCategories.length} new categories and ${insertedProducts.length} new products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
