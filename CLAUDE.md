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
npm run db:seed        # upsert the initial catalogue (src/db/seed-data.ts); safe to re-run
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
- **Sign out** goes through `signOutAction` (`src/app/account/actions.ts`) and `SignOutButton`, a plain form that also works without JavaScript. Don't use the client `signOut`.
- **`redirectTo` is user input:** always pass it through `safeRedirect` (`src/lib/redirect.ts`), which accepts same-site paths only. It's in its own file because client forms import it, and `src/lib/session.ts` is server-only code.
- **`nextCookies()` stays last in `plugins`.** Without it, `auth.api` calls in Server Actions can't set or clear cookies.
- **Rate limits are stored in Postgres** (`rateLimit.storage: "database"`), because in-memory counters are per serverless instance. Auth requests depend on the `rate_limit` table, so it must be migrated.
- **Secret and origin:** `requireStrongSecret` stops production from starting with a weak `BETTER_AUTH_SECRET`; keep it. Better Auth reads `BETTER_AUTH_URL` from the environment, and it must match the origin being browsed. Any other host (such as ngrok) must be added to `trustedOrigins`.

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
- **Seeds** (`src/db/seed.ts`) are idempotent upserts keyed on `slug`.
- **Builds need data:** with `cacheComponents`, `generateStaticParams` must return at least one param, so `next build` needs a reachable, seeded database.

## Payments (Bakong KHQR)

Stripe isn't available in Cambodia, so checkout uses Bakong KHQR. For KHQR background (QR format, Bakong API), use the `khqr-bakong` skill. The code is in `src/lib/khqr/` (`encode.ts`, `bakong.ts`, `config.ts`, `image.ts`), `src/lib/orders.ts` and `src/app/checkout/actions.ts`.

- **Check payment only when the customer clicks** "I've paid — check payment" in the QR popup. This is the owner's decision. Don't add polling, status routes or a reconciliation cron unless asked.
- **Bakong has no webhook.** The only proof of payment is `check_transaction_by_md5` returning `responseCode 0`. Before marking an order paid, verify `toAccountId` (our account), `currency` (USD) and `amount` (exactly the order total in cents).
- **We build the QR ourselves**; it doesn't come from Bakong. The server builds the KHQR string (`buildKhqr`) and saves the exact string plus its MD5 on the order. Never rebuild it later: the string contains timestamps, so a rebuilt QR has a different MD5.
- **The server decides amount, account and bill number** from the database and env, never from the request. The KHQR bill number is `orders.reference`.
- **Settle orders with conditional updates:** `pending → paid` (`WHERE status = 'pending'`), `expired → paid_late` (needs staff). `bakong_hash` is UNIQUE. Only the request that wins the update runs side effects (clearing the bag).
- **Bakong errors are never "unpaid".** HTTP 401/403/429/5xx and timeouts throw `BakongUnavailableError`, and the customer sees "try again". Nothing changes.
- **Stock is reserved when the order is created** (in the same `db.batch`) and released when the QR expires. Expiry is handled lazily with a database-only statement (no Bakong call). If the customer places the same bag again, their unexpired QR is reused.
- **QR image:** a PNG data URL with a small round `public/assets/bakong.png` icon, at **12% width, error correction Q, `scale: 8`** (whole-pixel squares), displayed with `image-rendering: pixelated`. Decode tests showed a 16% icon and level H scan worse. Before changing the icon or the QR settings, re-run a jsQR + ZXing decode comparison against the plain QR. If it scans worse, keep the plain QR. Any icon error falls back to the plain QR.
- **Checkout requires sign-in.** Orders belong to `user.id`.
- **Env vars:** `BAKONG_TOKEN`, `BAKONG_ACCOUNT_ID`, `MERCHANT_NAME` (ASCII, ≤25), `MERCHANT_CITY` (ASCII, ≤15), plus optional `MERCHANT_PHONE`, `STORE_LABEL`, `TERMINAL_LABEL`, `KHQR_EXPIRATION_MINUTES` (default 15) and `BAKONG_API_URL` (point it at a local mock to test the paid flow). The token is server-only and reportedly expires about every 90 days.
- **Not yet confirmed:** reportedly the Bakong API only accepts Cambodian IPs. Test from the hosting region before deploying.

## Environment

Required variables (see `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.

Known gotchas in the current setup:
- `drizzle.config.ts` and `db:seed` load `.env.local` first, then `.env`.
- The `.gitignore` rule `.env*` also matches `.env.example`. Add `!.env.example` before committing it.
- `auth:generate` calls `@better-auth/cli`, which is deprecated; Better Auth now suggests `npx auth generate`.
