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
- **Auth:** only email/password is enabled. The server reads the session with `auth.api.getSession({ headers: await headers() })`; the client uses `useSession`, `signIn`, `signUp` and `signOut` from `@/lib/auth-client`. Better Auth reads `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` from the environment on its own.
- **Tailwind v4** is set up in CSS (`src/app/globals.css` using `@import "tailwindcss"` and `@theme`) and runs through `@tailwindcss/turbopack`. There is no `tailwind.config` file.
- Import alias: `@/*` → `src/*`.

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

## Environment

Required variables (see `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.

Known gotchas in the current setup:
- `drizzle.config.ts` and `db:seed` load `.env.local` first, then `.env`.
- The `.gitignore` rule `.env*` also matches `.env.example`. Add `!.env.example` before committing it.
- `auth:generate` calls `@better-auth/cli`, which is deprecated; Better Auth now suggests `npx auth generate`.
