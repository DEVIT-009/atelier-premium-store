// Catalogue access. Reads products from Postgres; components only ever see the
// Product shape below, never raw DB rows.
import { desc, eq, inArray, ne, sql } from "drizzle-orm";
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

export async function getCategorySlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.select({ slug: categories.slug }).from(categories);
  return rows.map((row) => row.slug);
}

// The department's products plus unisex pieces, newest first
export async function getDepartmentProducts(department: "women" | "men") {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    where: inArray(products.department, [department, "unisex"]),
    with: { category: true },
    orderBy: [desc(products.createdAt)],
  });
  return rows.map(toProduct);
}

// The category with its products, newest first; undefined for unknown slugs
export async function getCategoryWithProducts(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    with: { products: { orderBy: [desc(products.createdAt)] } },
  });
  if (!category) return undefined;

  const { products: rows, ...rest } = category;
  return {
    category: { slug: rest.slug, name: rest.name } satisfies Category,
    products: rows.map((row) => toProduct({ ...row, category: rest })),
  };
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

// Products for the given slugs (unknown slugs are skipped), in no set order
export async function getProductsBySlugs(slugs: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  if (slugs.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: inArray(products.slug, slugs),
    with: { category: true },
  });
  return rows.map(toProduct);
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
