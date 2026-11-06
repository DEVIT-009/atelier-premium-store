// Loads the initial catalogue. Safe to re-run: rows are upserted by slug.
// Usage: npm run db:seed
import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories, products } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

async function main() {
  const insertedCategories = await db
    .insert(categories)
    .values(seedCategories)
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: sql`excluded.name` },
    })
    .returning({ id: categories.id, slug: categories.slug });

  const categoryIds = new Map(insertedCategories.map((c) => [c.slug, c.id]));

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
  await db
    .insert(products)
    .values(rows)
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        details: sql`excluded.details`,
        priceCents: sql`excluded.price_cents`,
        stock: sql`excluded.stock`,
        imageUrl: sql`excluded.image_url`,
        imageAlt: sql`excluded.image_alt`,
        badge: sql`excluded.badge`,
        categoryId: sql`excluded.category_id`,
        department: sql`excluded.department`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`now()`,
      },
    });

  console.log(
    `Seeded ${insertedCategories.length} categories and ${rows.length} products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
