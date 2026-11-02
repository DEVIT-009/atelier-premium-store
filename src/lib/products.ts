// Catalogue access. Reads products from Postgres; components only ever see the
// Product shape below, never raw DB rows.
import { desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { ImageAsset } from "@/lib/sample-data";

export type Category = {
  slug: string;
  name: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number; // USD cents
  stock: number; // units available; 0 = sold out
  image: ImageAsset;
  description: string;
  details: string[];
  badge: string | null;
};

export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = "in-stock" | "low-stock" | "sold-out";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "sold-out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export function getStockLabel(stock: number) {
  switch (getStockStatus(stock)) {
    case "sold-out":
      return "Sold out";
    case "low-stock":
      return `Only ${stock} left`;
    default:
      return "In stock";
  }
}

export function getCategoryHref(category: Category) {
  return `/${category.slug}`;
}

type ProductRow = typeof products.$inferSelect & {
  category: Category;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: { slug: row.category.slug, name: row.category.name },
    price: row.priceCents,
    stock: row.stock,
    image: { src: row.imageUrl, alt: row.imageAlt },
    description: row.description,
    details: row.details,
    badge: row.badge,
  };
}

// Revalidate after catalogue or stock changes with revalidateTag("products")
export async function getProducts({ limit }: { limit?: number } = {}) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: { category: true },
    orderBy: [desc(products.createdAt)],
    limit,
  });
  return rows.map(toProduct);
}

export async function getProductSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });
  return row ? toProduct(row) : undefined;
}

// Same category first, then the rest of the catalogue
export async function getRelatedProducts(product: Product, limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db
    .select()
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(ne(products.id, product.id))
    .orderBy(
      desc(sql`${categories.slug} = ${product.category.slug}`),
      desc(products.createdAt),
    )
    .limit(limit);
  return rows.map((row) =>
    toProduct({ ...row.products, category: row.categories }),
  );
}
