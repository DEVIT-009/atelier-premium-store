# Plan: Move the product catalog to Postgres (Drizzle + Neon)

## Context
The storefront reads a hardcoded `products` array from `src/lib/sample-data.ts`, going through the access layer `src/lib/products.ts`. That file's own comment says its function bodies are meant to be replaced with Drizzle queries. This plan moves **products, categories and stock** into Neon Postgres. Cart, orders, payments, reviews, wishlists and variants are left out. The UI should look exactly the same; only the data source changes.

### How the storefront uses product data today
| Consumer | Uses |
|---|---|
| `src/components/home/new-arrivals.tsx` | `getProducts().slice(0, 8)` (sync) |
| `src/app/products/[slug]/page.tsx` | `generateStaticParams` (all slugs), `generateMetadata` + page → `getProductBySlug`, `getRelatedProducts` (same category first, then others, limit 4), `getCategoryHref(product.category)`, JSON-LD |
| `src/components/product/product-card.tsx` | `Product` type from sample-data; `name, slug, category, price, stock, badge, image.{src,alt}` |
| `src/components/product/stock-status.tsx` | `getStockStatus` / `getStockLabel` (pure helpers, unchanged) |

Fields in use: `id, slug, name, category (string), price (USD cents), stock, image {src, alt}, description, details string[], badge?`. There are 6 distinct categories: Bags, Ready-to-Wear, Jewelry, Accessories, Shoes, Watches.

Out of scope: `navigation`, `hero`, `collections` (Women/Men/Shoes/Jewelry are merchandising entries, not product categories), `stories`, `eveningEdit`, `tailoring` and `services`. These stay in `sample-data.ts` as static marketing content.

## Database structure

```
categories 1 ──< products        (products.category_id → categories.id, ON DELETE RESTRICT)
```

**`categories`**
| column | type | notes |
|---|---|---|
| id | uuid PK | `defaultRandom()` |
| slug | text | NOT NULL, UNIQUE (e.g. `ready-to-wear`) |
| name | text | NOT NULL (e.g. `Ready-to-Wear`) |
| created_at / updated_at | timestamptz | default now(); `updated_at` uses `$onUpdate` |

**`products`**
| column | type | notes |
|---|---|---|
| id | uuid PK | `defaultRandom()` |
| slug | text | NOT NULL, UNIQUE (used in the `/products/[slug]` URL) |
| name | text | NOT NULL |
| description | text | NOT NULL |
| details | text[] | NOT NULL, default `'{}'` (ordered bullet list) |
| price_cents | integer | NOT NULL, CHECK `>= 0`; currency is always USD, like today |
| stock | integer | NOT NULL, default 0, CHECK `>= 0`; 0 = sold out |
| image_url | text | NOT NULL |
| image_alt | text | NOT NULL |
| badge | text | nullable (e.g. "New") |
| category_id | uuid | NOT NULL, FK → categories.id, RESTRICT; indexed |
| created_at / updated_at | timestamptz | default now(); "New In" sorts by `created_at desc` |

Notes:
- Stock is a column (your choice). When variants are added later, it moves to the variant table.
- Prices are integer cents, matching `formatPrice` in `src/lib/format.ts` and the current `price` field.
- There's no FK to `user` yet; nothing in this scope needs one.

## Files

**New**
- `src/db/schema/catalog.ts`: `categories` and `products` tables built with `pgTable`, `uuid`, `text`, `integer`, `timestamp`, `check`, `index` and `uniqueIndex`, plus `relations()` (`products.category` one, `categories.products` many) so that `db.query.products.findFirst({ with: { category: true } })` works.
- `src/db/seed-data.ts`: the 8 products and 6 categories, moved out of `sample-data.ts` (same copy, Unsplash URLs and `unsplash()` helper). Each product refers to its category by slug.
- `src/db/seed.ts`: an idempotent seed. Step 1: upsert categories (`onConflictDoUpdate` on slug, `returning` id/slug). Step 2: upsert products with the mapped `category_id`, using staggered `created_at` so "New In" keeps the current order. It runs the products step through `db.batch` (neon-http doesn't support interactive transactions).
- `drizzle/0000_*.sql` (+ `meta/`): generated, never written by hand.

**Modified**
- `src/db/schema/index.ts`: add `export * from "./catalog";`.
- `drizzle.config.ts`: load `.env.local` with `dotenv` (already a dependency): `config({ path: ".env.local" })`. This fixes the known gotcha where `db:*` scripts can't see `DATABASE_URL`.
- `package.json`: add the `db:seed` script `tsx --env-file=.env.local src/db/seed.ts` and the `tsx` devDependency.
- `src/lib/products.ts`: rewritten as the DB access layer (details below). The pure helpers `getStockStatus`, `getStockLabel` and `LOW_STOCK_THRESHOLD` stay unchanged. `getCategoryHref(category)` now takes the category object and returns `/${category.slug}`, no longer slugifying the name.
- `src/lib/sample-data.ts`: remove the `Product` type and the `products` array. Keep `ImageAsset` and the marketing content.
- `src/components/product/product-card.tsx`: import `Product` from `@/lib/products`; `product.category` → `product.category.name`.
- `src/components/home/new-arrivals.tsx`: becomes `async`; `await getProducts({ limit: 8 })`.
- `src/app/products/[slug]/page.tsx`: `generateStaticParams` becomes async and uses `getProductSlugs()`; `await` the product and related lookups; use `product.category.name` for the breadcrumb, eyebrow and JSON-LD, and `getCategoryHref(product.category)` for the link.

## Data access layer (`src/lib/products.ts`)
The UI keeps a stable domain type, so components never see DB rows:
```ts
export type Product = {
  id: string; slug: string; name: string;
  category: { slug: string; name: string };
  price: number;        // cents (mapped from price_cents)
  stock: number;
  image: ImageAsset;    // mapped from image_url / image_alt
  description: string; details: string[]; badge: string | null;
};
```
Functions (all `async`, all `"use cache"` + `cacheLife("hours")` + `cacheTag("products")`, as the Next 16 caching doc `01-app/01-getting-started/08-caching.md` recommends with `cacheComponents: true`):
- `getProducts({ limit? })`: `db.query.products.findMany({ with: { category: true }, orderBy: desc(createdAt), limit })`
- `getProductBySlug(slug)`: `findFirst` with `where: eq(slug)`, returning `undefined` when there's no match (the page already calls `notFound()`)
- `getProductSlugs()`: selects only the `slug` column, for `generateStaticParams`
- `getRelatedProducts(product, limit = 4)`: one query with `where id != product.id`, ordered by `(category_id = product's category) desc, created_at desc`, then `limit`. It behaves like today's "same category first, then the rest".
- A private `toProduct(row)` mapper.

Caching means pages still prerender into the static shell, just as they do now. The `products` tag gives a clean hook for `revalidateTag("products")` once an admin or stock update path exists. This plan adds no admin UI.

**Build caveat:** with `cacheComponents`, `generateStaticParams` must return at least one param. `next build` therefore needs a reachable, seeded database (`DATABASE_URL` set at build time).

## Migration approach
You confirmed the dev data is disposable, so the project switches from `db:push` to versioned migrations:
1. Add the schema and config changes above.
2. Reset the dev DB once: in the Neon console, reset the branch, or run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`. This removes the pushed auth tables. **I'll ask before doing this step.**
3. `npm run db:generate`: creates `drizzle/0000_*.sql` containing the auth and catalog tables as the baseline. Review the SQL, especially the CHECKs, the FK `ON DELETE restrict` and the unique indexes.
4. `npm run db:migrate`: applies the migration and records it in `drizzle.__drizzle_migrations`.
5. `npm run db:seed`: loads the 6 categories and 8 products.
6. From then on, every schema change follows `db:generate` → review → `db:migrate`. `db:push` is used only for throwaway experiments.

## Verification
- `npx tsc --noEmit` and `npm run lint` both pass.
- `npm run db:studio`: 6 categories and 8 products are present, every product has a category, and inserting `stock = -1` is rejected.
- Running `npm run db:seed` twice creates no duplicates.
- `npm run dev`:
  - The home page "New In" shows the same 8 cards in the same order, with the same badges. Sold-out (Twisted Gold Hoop Earrings) and low-stock ("Only 3 left", "Only 2 left") states render correctly.
  - `/products/chevron-chain-shoulder-bag` shows the breadcrumb category link `/bags`, the details list, the price and stock status, and 4 related products with Bags first.
  - `/products/does-not-exist` returns a 404.
  - Changing a product's stock to 0 in Studio and then restarting dev or revalidating shows "Sold out".
- `npm run build` succeeds and the product pages are prerendered.
