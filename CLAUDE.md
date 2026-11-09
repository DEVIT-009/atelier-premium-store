# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Next.js 16 differs from older versions you may know. Check `node_modules/next/dist/docs/` before writing Next.js code. `next.config.ts` turns on `cacheComponents` and `partialPrefetching`, which change how data fetching and caching behave.

## Project

Atelier Store is an eCommerce app in early scaffolding: only the infrastructure is wired up so far. Ecommerce features, UI, payments and full auth flows haven't been built yet; `src/app/page.tsx` is still the create-next-app placeholder.

Stack: Next.js 16 (App Router, React 19), TypeScript (strict), Tailwind CSS v4, Better Auth, Drizzle ORM, Neon Postgres. Package manager: npm.

## Commands

```bash
npm run dev            # dev server on http://localhost:3000
npm run build          # production build
npm run lint           # ESLint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit       # type-check (no separate script)

npm run db:generate    # generate SQL migrations from src/db/schema into ./drizzle
npm run db:migrate     # apply migrations
npm run db:push        # throwaway experiments only; real changes use migrations
npm run db:studio      # Drizzle Studio
npm run db:seed        # insert catalogue rows missing by slug (src/db/seed-data.ts); never changes existing rows
npm run auth:generate  # regenerate src/db/schema/auth.ts from the Better Auth config
```

There is no test framework set up yet.

## Architecture

How a request flows through the app:

```
client component → authClient (src/lib/auth-client.ts, better-auth/react)
  → /api/auth/* (src/app/api/auth/[...all]/route.ts, toNextJsHandler)
  → auth (src/lib/auth.ts, betterAuth + drizzleAdapter, provider "pg")
  → db (src/db/index.ts, drizzle over neon-http)
  → Neon Postgres
```

- **`db` from `@/db`** is the single database client. It uses Neon's HTTP driver, which is stateless and runs one query per request with no connection pool. The neon-http driver doesn't support interactive transactions; use `db.batch([...])`, or switch to the Neon websocket `Pool` driver if transactions become necessary.
- **Schema:** each domain gets its own file in `src/db/schema/`, re-exported from `src/db/schema/index.ts`. The full schema goes into `drizzle()`, so relational queries (`db.query.<table>`) work. `drizzle.config.ts` reads the same folder.
- **`src/db/schema/auth.ts` is generated** by the Better Auth CLI (`user`, `session`, `account`, `verification`). Don't hand-edit it: change the `betterAuth` config in `src/lib/auth.ts` (plugins, `user.additionalFields`), then run `npm run auth:generate` followed by a migration. To link app tables to users, add a foreign key to `user.id` (a text ID, not a uuid).
- **Auth:** Better Auth with email/password only. See [Authentication](#authentication-better-auth).
- **Tailwind v4** is set up in CSS (`src/app/globals.css` using `@import "tailwindcss"` and `@theme`) and runs through `@tailwindcss/turbopack`. There is no `tailwind.config` file.
- Import alias: `@/*` → `src/*`.

## Authentication (Better Auth)

- **Email and password only, with no email or phone verification.** This is the owner's decision. Sign-up signs the user straight in (`autoSignIn`), and passwords are 8–128 characters. The app sends no email, so there is no password reset. Don't add verification, reset or social login unless asked.
- **Reading the session on the server:** use `getSession()` from `@/lib/session`, not `auth.api.getSession` directly. It reads request headers, so call it inside `<Suspense>` or a Server Action, never inside `"use cache"`.
- **Protecting a page or action:** call `getSession()`, and with no session `redirect("/sign-in?redirectTo=<path>")`. Server Actions check for themselves; a check on the page doesn't protect them.
- **Sign in and sign up** are client forms that call `signIn.email` / `signUp.email` from `@/lib/auth-client`, wrapped in `useActionState`. On success they call `router.replace(redirectTo)` then `router.refresh()`. Show errors through `getAuthErrorMessage` (`src/components/auth/auth-error.ts`), not Better Auth's raw messages.
- **Sign out** goes through `signOutAction` (`src/app/(store)/account/actions.ts`) and `SignOutButton`, a plain form that also works without JavaScript. Don't use the client `signOut`.
- **`redirectTo` is user input:** always pass it through `safeRedirect` (`src/lib/redirect.ts`), which accepts same-site paths only. It's in its own file because client forms import it, and `src/lib/session.ts` is server-only code.
- **`nextCookies()` stays last in `plugins`.** Without it, `auth.api` calls in Server Actions can't set or clear cookies.
- **Rate limits are stored in Postgres** (`rateLimit.storage: "database"`), because in-memory counters are per serverless instance. Auth requests depend on the `rate_limit` table, so it must be migrated.
- **Secret and origin:** `requireStrongSecret` stops production from starting with a weak `BETTER_AUTH_SECRET`; keep it. Better Auth reads `BETTER_AUTH_URL` from the environment, and it must match the origin being browsed. Any other host (such as ngrok) must be added to `trustedOrigins`.

## Admin

- **Role:** `user.role` (`additionalFields`, default `"user"`). `input: false` is what stops users setting it through sign-up or update-user, so keep it, and never set `returned: false` or the guard locks everyone out. Only `promoteToAdmin` and `demoteAdmin` in `src/lib/admin-users.ts` write `role`. Because sign-up has no email verification and anyone can register an address first, promotion requires a reason and the account's email typed to confirm. The first admin is still promoted by hand in the database, matching both `id` and `email`. Don't add the Better Auth admin plugin, whose built-in endpoints exceed what's needed, or turn on the session cookie cache, which would delay revoking a role.
- **Guard:** call `requireAdmin()` (`src/lib/admin.ts`) first in every admin page component, Server Action and data function, before any `try`. Signed-out visitors go to sign-in and signed-in non-admins get a 404. The check in `admin/layout.tsx` only hides the navigation; it doesn't protect anything.
- **Reads** stay uncached and never go through the `"use cache"` readers in `src/lib/products.ts`. Links to admin pages use `prefetch={false}`, or every link on screen would read the session and its data from the database.
- **Orders:** reads and writes are in `src/lib/admin-orders.ts`, actions in `src/app/admin/orders/actions.ts`. Each status or fulfilment change is one conditional statement (`WHERE status = <expected>`) that also moves stock and writes the `order_events` row, so repeating an action changes stock only once. Page the list by order id, not by a JS `Date`, which loses `created_at`'s microseconds.
- **Stock on order changes:** accepting `paid_late` reserves stock again, all or nothing. Cancelling `pending` asks Bakong first, then releases. Refunding `paid_late` never releases, because it was already released. Refunding `paid` releases unless the pieces have left the store (`shipped`, `delivered`, `collected`), when staff choose.
- **Refunds and mark-paid:** refunds are bank transfers made by hand, and the app only records them. There is no manual "mark paid": Bakong stays the only proof. The app sends no email, so staff tell customers about changes themselves.
- **Products:** reads and writes are in `src/lib/admin-products.ts`, actions in `src/app/admin/products/actions.ts`, with `updateTag("products")` after each write so the storefront changes straight away. Editing never writes `stock`, which is set at creation and then changes through orders or `adjustStock`. Slugs are permanent once created. A product image is a link or an upload.
- **Product images:** everything about storing and checking them is in `src/lib/product-images.ts`, so a storage provider can replace it later. A product image is a Cloudinary upload or a link. Links must be on a host in `next.config.ts` `remotePatterns`, or `next/image` breaks the store page; `IMAGE_HOSTS` in `src/lib/admin-products.ts` must match it, apart from Cloudinary, which is for uploads only. The server fetches a new link and checks it really is a JPG, PNG or WebP, because links often have no extension. Uploads accept JPG, PNG or WebP, are re-encoded with `sharp`, and are always saved as `prod_<product id>.webp` in the Cloudinary folder `atelier-store/products` (or `CLOUDINARY_PRODUCT_FOLDER`). Nothing is saved on the server's disk. Replacing an image overwrites the file and changes the version in its URL, so caches load the new one. Deleting a product, or switching it from an upload to a link, moves the file to `deleted/` inside that folder. In this account a Cloudinary folder is separate from the image's name, so moving one takes a rename and an `asset_folder` update.
- **Product status:** only `active` products are on the storefront or can be bought; every reader in `src/lib/products.ts` and the query in `createOrder` filter on it, and new readers must too. Archiving doesn't touch QRs already issued, which still settle. The last active product can't leave `active`, because `generateStaticParams` needs at least one param or `next build` fails. Only products with no order items and no stock history can be deleted.
- **Stock adjustments:** `adjustStock` changes `stock` and writes `stock_movements` in one statement, by a relative amount and only if the result stays `>= 0`. There is deliberately no "set stock to N", which could overwrite a checkout happening at the same moment. Units held by unpaid QRs have already left `stock`, so they can't be removed. Orders don't write `stock_movements`, and neither does the stock set at creation.
- **Categories:** reads and writes are in `src/lib/admin-categories.ts`, actions in `src/app/admin/categories/actions.ts`. A category page is `/<slug>`, so a new top-level route must also go in `RESERVED_CATEGORY_SLUGS`, or a category could claim its URL. Slugs are permanent. A category with products, in any status, can't be deleted, and `db:seed` brings back a deleted seed category.
- **Store menu and homepage:** New In, Women and Men are fixed in `src/lib/sample-data.ts`. After them come the categories staff choose (`show_in_menu`, `show_on_home`), ordered by `position` then name, read by `getStoreCategories()` in `src/lib/products.ts`. A category is shown only while it has an active product, and its homepage tile uses the photo of its newest active product, so no link leads to an empty page and there's no category image to manage. New categories go last and start hidden. The settings are cached under `products`, so a change made directly in the database doesn't show until the cache refreshes; change them through admin.
- **Users:** reads and writes are in `src/lib/admin-users.ts`, actions in `src/app/admin/users/actions.ts`. Staff can sign a user out everywhere (delete their `session` rows), block and unblock. Each action is one statement that also writes `user_events` (who, why, how many devices). `user.blocked_at` (a Better Auth additional field, `input: false`) is enforced twice: a `databaseHooks.session.create.before` hook refuses new sessions (`ACCOUNT_BLOCKED`, after the password check), and `getSession()` returns null for a blocked user, which covers a sign-in racing the block. Anything reading the session must go through `getSession()`, not `auth.api.getSession`. Admins can't be blocked (remove their access first), and staff can't act on their own account. Removing admin access counts the admins with their rows locked, so the store always keeps at least one, even if two admins remove each other at once. Role changes apply on the next request because there's no session cookie cache. "Admin since" comes from the latest `promoted` event, so admins made by hand show as "Before admin access was recorded". Blocking leaves orders alone, so a pending QR can still be paid. User ids are Better Auth strings, not uuids: check them with `isUserId`, not `isUuid`.
- **Overview:** `/admin` reads `getDashboard()` in `src/lib/admin-dashboard.ts` in one `db.batch`. Each count uses the exported filter conditions of the list it links to (`ORDER_FILTER_CONDITIONS`, `PRODUCT_FILTER_CONDITIONS`, `USER_FILTER_CONDITIONS`), so a new or changed filter changes both. Sales are `paid` orders by `paid_at`, with "today" starting at midnight store time (Asia/Phnom_Penh), and there's no marker for test orders, so they count. It never calls Bakong.
- **Layouts:** the root layout holds only html, body and fonts. Storefront routes live in `src/app/(store)/` with the header and footer; `src/app/admin/` has its own header. New store routes go in `(store)`.

## Database conventions

- **Migrations only.** Schema changes go `npm run db:generate` → review the SQL in `./drizzle` → `npm run db:migrate`. Never hand-edit generated migrations and don't use `db:push` on a shared database.
- **Naming:** tables are plural snake_case (`products`); columns are snake_case in SQL and camelCase in TypeScript (`priceCents: integer("price_cents")`).
- **Keys:** app tables use `uuid().defaultRandom()` primary keys. Anything URL-facing also gets a unique `slug`. Foreign keys to users point at `user.id`, which is `text`.
- **Money** is stored as integer cents (`price_cents`) with a `>= 0` CHECK. Currency is USD only, with no currency column. Never use floats or numeric for prices.
- **Stock** is an integer `products.stock` column (`>= 0` CHECK; 0 means sold out). There's no separate inventory table. When product variants are added, stock moves to the variant.
- **Integrity in the database:** enforce invariants with CHECK constraints and NOT NULL. Catalog foreign keys use `ON DELETE restrict`; only auth tables cascade.
- **Timestamps:** `created_at` / `updated_at` as `timestamp({ withTimezone: true })`, `defaultNow()`, and `$onUpdate` on `updated_at`.
- **Relations:** define `relations()` next to each table so `db.query.<table>` with `with:` works. For joins with custom ordering, use the core `select().innerJoin()` builder.
- **No interactive transactions** (neon-http). Make a write atomic with a single multi-row statement or `db.batch([...])`.
- **Reads go through a data-access layer** in `src/lib/` (e.g. `src/lib/products.ts`). It maps rows to domain types, so components never import from `@/db`. Wrap reads in `"use cache"` + `cacheLife(...)` + `cacheTag("<domain>")`, and call `revalidateTag("<domain>")` after every write to that domain.
- **Seeds** (`src/db/seed.ts`) are insert-only, keyed on `slug`. Re-running never overwrites live stock, prices or edits, so changing `seed-data.ts` doesn't update rows that already exist.
- **Builds need data:** with `cacheComponents`, `generateStaticParams` must return at least one param, so `next build` needs a reachable, seeded database.

## Payments (Bakong KHQR)

Stripe isn't available in Cambodia, so checkout uses Bakong KHQR. For KHQR background (QR format, Bakong API), use the `khqr-bakong` skill. The code is in `src/lib/khqr/` (`encode.ts`, `bakong.ts`, `config.ts`, `image.ts`), `src/lib/orders.ts` and `src/app/(store)/checkout/actions.ts`.

- **Check payment only on a click:** "I've paid — check payment" in the QR popup, "Place order" when it would replace an earlier QR (their last few orders, up to an hour past expiry), so a payment already made isn't orphaned or paid twice, or staff's "Re-check payment" and "Cancel order". This is the owner's decision. Don't add polling, status routes or a payment reconciliation cron unless asked.
- **Bakong has no webhook.** The only proof of payment is `check_transaction_by_md5` returning `responseCode 0`. Before marking an order paid, verify `toAccountId` (our account), `currency` (USD) and `amount` (exactly the order total in cents).
- **We build the QR ourselves**; it doesn't come from Bakong. The server builds the KHQR string (`buildKhqr`) and saves the exact string plus its MD5 on the order. Never rebuild it later: the string contains timestamps, so a rebuilt QR has a different MD5.
- **The server decides amount, account and bill number** from the database and env, never from the request. The KHQR bill number is `orders.reference`.
- **Settle orders with conditional updates:** `pending → paid` (`WHERE status = 'pending'`), `expired` or `cancelled → paid_late` (needs staff, since a cancelled QR can still be scanned until it expires). `bakong_hash` is UNIQUE. Only the request that wins the update runs side effects (clearing the bag).
- **Bakong errors are never "unpaid".** HTTP 401/403/429/5xx and timeouts throw `BakongUnavailableError`, and the customer sees "try again". Nothing changes.
- **Stock is reserved when the order is created** (in the same `db.batch`) and released when the QR expires. Expiry is a database-only statement (no Bakong call), run when an order is placed and by `GET /api/cron/expire-orders` (`Authorization: Bearer $CRON_SECRET`), which must be scheduled on the host, about every 5 minutes. If the customer places the same bag again, their unexpired QR is reused with the latest delivery details. A customer's own reservation counts as available to them in the bag.
- **QR image:** a PNG data URL with a small round `public/assets/bakong.png` icon, at **12% width, error correction Q, `scale: 8`** (whole-pixel squares), displayed with `image-rendering: pixelated`. Decode tests showed a 16% icon and level H scan worse. Before changing the icon or the QR settings, re-run a jsQR + ZXing decode comparison against the plain QR. If it scans worse, keep the plain QR. Any icon error falls back to the plain QR.
- **Checkout requires sign-in.** Orders belong to `user.id`.
- **Env vars:** `BAKONG_TOKEN`, `BAKONG_ACCOUNT_ID`, `MERCHANT_NAME` (ASCII, ≤25), `MERCHANT_CITY` (ASCII, ≤15), plus optional `MERCHANT_PHONE`, `STORE_LABEL`, `TERMINAL_LABEL`, `KHQR_EXPIRATION_MINUTES` (default 15) and `BAKONG_API_URL` (point it at a local mock to test the paid flow). The token is server-only and reportedly expires about every 90 days. `CRON_SECRET` protects the expiry route, which stays closed without it.
- **Not yet confirmed:** reportedly the Bakong API only accepts Cambodian IPs. Test from the hosting region before deploying.

## Error pages

- All of them use `StatusPage` (`src/components/layout/status-page.tsx`). 404: `not-found.tsx` in `(store)` and the app root. 401/403: `(store)/unauthorized.tsx` and `forbidden.tsx`, shown by `unauthorized()` / `forbidden()` (`experimental.authInterrupts`). 500: `(store)/error.tsx`, `error.tsx`, `global-error.tsx`.
- **400 is the only reason `src/pages` exists.** Next answers malformed URLs (`/%E0%A4%A`) before the App Router runs, so `src/pages/_error.tsx` is the only way to style them. Keep `src/pages/400.tsx`: without a real page there, `next build` fails. All real pages stay in the App Router.
- Because `src/pages` exists, `usePathname()` and `useSearchParams()` are typed as nullable. Handle null with `?.`.
- A response that has started streaming keeps status 200, with `noindex` added. `notFound()`, `forbidden()` and `unauthorized()` inside `<Suspense>` show the right page but not the right status.

## Environment

Required variables (see `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. `next.config.ts` needs the cloud name at build time, so builds fail without it. The API secret is server-only.

Known gotchas in the current setup:
- `drizzle.config.ts` and `db:seed` load `.env.local` first, then `.env`.
- The `.gitignore` rule `.env*` also matches `.env.example`. Add `!.env.example` before committing it.
- `auth:generate` calls `@better-auth/cli`, which is deprecated; Better Auth now suggests `npx auth generate`.
