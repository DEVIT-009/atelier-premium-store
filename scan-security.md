# Security Scan: Atelier Store

Date: 2026-11-03 · Scope: full repo at `b0ca450` · Method: manual code review + `npm audit`
Stack: Next.js 16.4.3, better-auth 1.7.14, drizzle-orm 0.45, Neon (neon-http)

## Summary

| Severity | Count | Fixed |
|---|---|---|
| Critical | 0 | – |
| High | 0 | – |
| Medium | 5 | 3 (M1, M2, M5) |
| Low | 4 | 0 |

No exploitable vulnerability was found in the current code: the app is mostly read-only catalogue pages. The findings are hardening gaps to close before auth, cart and checkout ship.

## Findings

### M1: No HTTP security headers (Medium) — **Fixed**
There was no `headers()` in `next.config.ts` and no `proxy.ts`, so the app sent no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy or Permissions-Policy. Pages could be clickjacked, and there was no CSP backstop against XSS.

**Fix:** `next.config.ts` now sends these on every route:
- A static `Content-Security-Policy` (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`). In production it adds `upgrade-insecure-requests`; `'unsafe-eval'` is dev only. This is the "Without Nonces" setup from the Next 16 CSP guide. A nonce CSP would force every page into dynamic rendering and break the prerendered product pages.
- `Strict-Transport-Security` (production only), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

Follow-up: the CSP still allows `'unsafe-inline'` for scripts. If a page goes dynamic later, consider switching to nonces (via `src/proxy.ts`) or SRI.

### M2: Auth rate limiting weak on serverless (Medium) — **Fixed**
Better Auth turns rate limiting on only in production, and it stores counters in memory by default. On serverless each instance has its own counters, so brute-forcing `/api/auth/sign-in/email` was barely throttled.

**Fix:** `rateLimit: { storage: "database" }` in `src/lib/auth.ts`. Better Auth's built-in rules apply: 3 requests / 10 s on sign-in, sign-up, change-password and change-email, and 3 / 60 s on password-reset and verification-email. The regenerated `src/db/schema/auth.ts` adds a `rate_limit` table, and migration `drizzle/0001_curly_mister_fear.sql` creates it.
**Action required:** run `npm run db:migrate`. Until the table exists, rate-limited auth requests in production will fail.

### M3: Email verification not required; no password-reset flow (Medium) — Open
`emailAndPassword: { enabled: true }` lets accounts register any email address without proving they own it, and there's no `sendResetPassword` handler.
Recommendation: before launch, set `requireEmailVerification: true`, add `emailVerification.sendVerificationEmail` and `sendResetPassword`, and consider raising `minPasswordLength` above 8.

### M4: Dev-tooling dependency advisories (Medium, dev-only) — Open
`npm audit` reports 20 moderate, 0 high and 0 critical issues, all transitive through dev tooling:
- `esbuild <=0.24.2` via `drizzle-kit` → `@esbuild-kit/*`: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (any website can send requests to esbuild's dev server and read the responses).
- `minimatch <11.0.1` via `eslint` / `eslint-config-next`: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (ReDoS).

Neither ships in the production bundle. Don't run `npm audit fix --force`: it proposes downgrades (`drizzle-kit@0.18.1`, `eslint@4`). Watch for upstream releases instead.

### M5: Weak BETTER_AUTH_SECRET accepted (Medium) — **Fixed**
This is a real issue, but it depends on what's deployed. Better Auth's `validateSecret` (`node_modules/better-auth/dist/context/create-context.mjs`) throws only when the secret is missing, or is the built-in default in production. A secret shorter than 32 chars or below ~120 bits of estimated entropy only logs a warning. The secret signs session cookies (HMAC-SHA256) and encrypts the cookie cache, so a guessable value lets attackers forge sessions.

**Fix:** `src/lib/auth.ts` now passes `secret` explicitly and, when `NODE_ENV=production`, throws if the secret is missing, the default, shorter than 32 chars, or below 120 bits (the same estimate Better Auth uses). Dev only gets Better Auth's warnings.
**Action required:** the secret currently in `.env` triggers both warnings, so production builds and starts will now fail until you replace it. Generate a new one with `openssl rand -base64 32` (rotating it signs out existing sessions).

### L1: Env vars use non-null assertions without validation (Low) — Open
`src/db/index.ts` and `drizzle.config.ts` use `process.env.DATABASE_URL!`, so a missing variable fails late and unclearly. Recommendation: validate env at startup (e.g. a zod schema in `src/lib/env.ts`).

### L2: `baseURL` / `trustedOrigins` not set explicitly (Low) — Open
Better Auth origin/CSRF checks rely on `BETTER_AUTH_URL` being right in every deploy, including previews. Recommendation: set `baseURL` and `trustedOrigins` from validated env.

### L3: Stale `.claude/settings.json` allowlist (Low / hygiene) — Open
It allows `pnpm typecheck` and `pnpm test *`, but the project uses npm and has neither script. The `deny` rules for `.env*` are good.

### L4: Product image URLs not validated on write (Low) — Open
`images.remotePatterns` is limited to `images.unsplash.com` (good), but `image_url` from the DB is emitted unchecked in JSON-LD/OpenGraph. Once an admin UI can write products, validate it against the same allowlist.

## Checked and OK
- **Secrets in git:** `.env` and `.env*.local` are ignored. History has no `.env` and no `.pem`; only `.env.example` is tracked.
- **SQL injection:** all queries use the Drizzle builder. The one `sql\`\`` (`getRelatedProducts` in `src/lib/products.ts`) uses parameterised interpolation. No `sql.raw`.
- **XSS:** the only `dangerouslySetInnerHTML` is the product JSON-LD, which escapes `<` as `<`. No `eval` or `innerHTML`.
- **Links:** every `href` comes from static data or slugs, with no user-controlled URLs.
- **DB integrity:** CHECK constraints on price/stock, `ON DELETE restrict` on the catalogue, and cascade only on auth tables.
- **Client exposure:** only `NEXT_PUBLIC_APP_URL` is public. `DATABASE_URL` stays server-side.

## Before cart/checkout/admin
- Re-check the session and authorisation (`auth.api.getSession`) in every server action or route handler that writes.
- Compute prices and stock server-side, and decrement stock atomically (`UPDATE ... SET stock = stock - $n WHERE stock >= $n`).
- Verify payment webhooks by signature, and make them idempotent.
- Use Better Auth's `admin` plugin for roles.
