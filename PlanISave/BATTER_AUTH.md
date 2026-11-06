 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Email/password Sign up & Sign in (Better Auth)

 Context

 Better Auth is already wired (src/lib/auth.ts, src/lib/auth-client.ts,
 src/app/api/auth/[...all]/route.ts) and the generated tables user, session,
 account, verification, rate_limit exist in src/db/schema/auth.ts. There is no UI
 yet: the header's account icon links to /account, which 404s. Goal: simple sign up,
 sign in and logout with email + password only, no email or phone verification,
 styled like the rest of the store.

 No new user fields → no schema change, no auth:generate, no new migration.

 Decisions

 - Email + password only. requireEmailVerification stays off (default) and
   autoSignIn stays on (default), so sign-up logs the user straight in.
 - Forms are client components calling authClient.signUp.email / signIn.email
   (cookie set by the browser fetch to /api/auth/*). Wrapped in
   useActionState so the existing PendingButton (useFormStatus) shows pending state.
 - Routes: /sign-in, /sign-up, /account (signed-in landing + sign out).
 - Optional ?redirectTo= (e.g. from checkout) — only accepted if it starts with /
   and not //, otherwise /account.

 Steps

 1. Server config — src/lib/auth.ts

 - emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 }
   (explicit; verification left off).
 - Add plugins: [nextCookies()] (from better-auth/next-js, must be last) so
   auth.api.* calls from server actions (sign out) can set/clear cookies.
 - Keep existing requireStrongSecret and rateLimit: { storage: "database" }.

 2. Make sure DB is current

 - npm run db:migrate to apply the pending drizzle/0001_curly_mister_fear.sql
   (rate_limit table — sign-in fails without it since rate limiting uses the DB).

 3. Shared form primitives (reuse, don't duplicate)

 - Move src/components/checkout/field.tsx → src/components/form/field.tsx;
   update the import in src/app/checkout/page.tsx.
 - Reuse src/components/bag/pending-button.tsx and the .input / .btn classes in
   src/app/globals.css.

 4. Session helper — src/lib/session.ts

 - getSession() → auth.api.getSession({ headers: await headers() }).
 - safeRedirect(value) → validated internal path, default /account.

 5. Auth pages (under src/app/(auth)/)

 Layout follows the existing page pattern: breadcrumb, eyebrow + text-title-xl
 heading, centered max-w-(--container-narrow) column.
 - sign-in/page.tsx + src/components/auth/sign-in-form.tsx ("use client"):
   email, password; generic error "Incorrect email or password"; link to sign up
   (carrying redirectTo); on success router.replace(redirectTo) + router.refresh().
 - sign-up/page.tsx + src/components/auth/sign-up-form.tsx: name, email,
   password (hint: 8+ characters); maps USER_ALREADY_EXISTS to
   "An account with this email already exists"; same redirect behaviour.
 - Both pages: read the session inside <Suspense> (cacheComponents) and
   redirect() to /account if already signed in.
 - Errors shown in a role="alert" paragraph in text-error; inputs use proper
   autoComplete (email, current-password, new-password, name).

 6. Account page — src/app/account/page.tsx

 - Inside <Suspense>: no session → redirect("/sign-in?redirectTo=/account").
 - Shows "Welcome, {name}" and email, plus the logout button (step 7).
 - robots: { index: false } on all three pages.

 7. Logout

 - Server action signOutAction in src/app/account/actions.ts:
   auth.api.signOut({ headers: await headers() }) (cookie cleared via
   nextCookies()), then redirect("/").
 - Reusable src/components/auth/sign-out-button.tsx: a <form action={signOutAction}>
   with PendingButton styled btn btn-secondary ("Sign out"). Works without JS.
 - Used on /account. Only an already-signed-in session can trigger it; calling it
   signed out is a harmless no-op + redirect.

 8. UI — follow the /build-ui skill, consistent with the Homepage

 Build the three pages (sign in, sign up, account) through the /build-ui workflow:
 1. Inspect the homepage and existing pages first (src/app/page.tsx,
    src/components/home/*, src/components/product/product-listing.tsx,
    src/app/bag/page.tsx, src/app/checkout/page.tsx).
 2. Reuse before creating: Field, PendingButton, .btn variants, .input,
    .eyebrow, .link/.link-quiet, page/section utilities, breadcrumb markup,
    Services strip from the homepage.
 3. Same visual language as the homepage: monochrome, hairline borders, sharp
    corners, light tightly-tracked headings (text-title-xl), uppercase labels,
    eyebrow → title → muted description.
    - Sign in / sign up: centered narrow column; on lg a split layout with an
      editorial image (new authFeature entry in src/lib/sample-data.ts, built with its
      existing unsplash() helper) in a media-frame (like the
      homepage editorial feature), form on the other side. Cross-links
      ("New to Atelier? Create an account" / "Already have an account? Sign in").
    - Account: eyebrow "My Account", "Welcome, {name}", email, sign-out button, and
      the homepage Services strip below.
 4. Keep scope to these pages only (no header changes).
 5. Verify responsive behaviour at 390px and 1440px.
 6. Run and visually verify the app (screenshots of each page and states:
    empty, error, signed-in).
 7. Run npx tsc --noEmit and npm run lint.
 8. Fix reproducible issues without expanding scope.
 9. Summarize changes.

 9. Out of scope (deliberately)

 Email verification, password reset, social login, header "signed in" state,
 linking bag/orders to users, protecting checkout.

 Critical files

 - Modify: src/lib/auth.ts, src/app/checkout/page.tsx (import path only)
 - Move: src/components/checkout/field.tsx → src/components/form/field.tsx
 - New: src/lib/session.ts, src/app/(auth)/sign-in/page.tsx,
   src/app/(auth)/sign-up/page.tsx, src/components/auth/sign-in-form.tsx,
   src/components/auth/sign-up-form.tsx, src/app/account/page.tsx,
   src/app/account/actions.ts, src/components/auth/sign-out-button.tsx
 - Edit: src/lib/sample-data.ts (add authFeature image)

 Notes / gotchas

 - NEXT_PUBLIC_APP_URL and BETTER_AUTH_URL must match the origin you browse
   (e.g. http://localhost:3000); otherwise the CSP (default-src 'self') blocks the
   client fetch, or Better Auth rejects it as an untrusted origin. If using the ngrok
   host, add it to trustedOrigins.
 - Built-in rate limits: 3 sign-in/sign-up attempts per 10s per IP.

 Verification

 1. npx tsc --noEmit, npm run lint.
 2. npm run dev, then in a browser (headless Chrome script used before):
    - /account signed out → redirected to /sign-in?redirectTo=/account.
    - Sign up with a new email → lands on /account showing the name; user and
      account rows exist (Drizzle Studio), email_verified = false, no email sent.
    - Sign up again with the same email → "already exists" error.
    - Logout (Sign out button, also with JS disabled) → /; session row deleted; /account redirects to sign-in again.
    - Sign in with wrong password → generic error; correct password → /account.
    - /sign-in?redirectTo=//evil.com → lands on /account, not off-site.
    - Visit /sign-in while signed in → redirected to /account.
 3. Screenshots at 390px and 1440px for all three pages.