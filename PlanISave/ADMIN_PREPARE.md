All five reports are in, and nothing has been implemented. The admin side can be built on the existing app, but staff currently have no way to see or resolve orders, and some customer payments can get lost. That makes orders the most urgent area.

These findings come from reading the code only: nothing was run, and the live database wasn't queried. The agents couldn't read .env.example because project settings block it, so env variable names come from CLAUDE.md.

Findings by area

Area: Products and categories
Current behavior: Both are real tables, but nav and homepage collections are hard-coded. Each product has one
image, and only Unsplash is allowed as a host.
Key constraint: Any ordered product can't be deleted, and there's no archive status. A category slug like men or
admin would save, but its page would never be reachable.
Recommendation: Add draft/active/archived status and reserved slugs, and keep admin reads uncached. Refresh with
updateTag("products").
────────────────────────────────────────
Area: Stock
Current behavior: One integer per product, with no sizes. It's reduced when an order is placed and restored when
the order expires. The database check prevents overselling.
Key constraint: stock means available for sale, not what's on the shelf. Setting an absolute number can oversell or
erase a reservation.
Recommendation: Use relative adjustments with a required reason, written with an audit row in one statement.
────────────────────────────────────────
Area: Admin access
Current behavior: No roles or proxy exist, and the session cookie cache is off, so a role change applies on the
next server check.
Key constraint: Sign-up has no email verification, so anyone could register an allowlisted email first. The role
field needs input: false, or users can set their own role.
Recommendation: Add a role column, promote the first admin by hand in the database, and call requireAdmin() in
every page, action and data function.
────────────────────────────────────────
Area: Orders
Current behavior: Statuses are pending → paid and pending → expired → paid_late. There's no fulfilment, cancel or
refund state, and no staff view.
Key constraint: Status changes must stay conditional, and stock must change in the same statement. Never rebuild
the QR.
Recommendation: Start with an order list and detail view plus an admin "re-check payment" that shares the existing
Bakong verification.
────────────────────────────────────────
Area: UI
Current behavior: Design tokens, Field, PendingButton, the native <dialog> and the Suspense guard pattern are all
reusable.
Key constraint: The root layout forces the store header and footer on every page. There are no tables, pagination,
toasts, field-level errors or uploads.
Recommendation: Move the store into a (store) route group and give /admin its own layout. Build the table, status
badge and confirm dialog.

Existing problems that affect admin

1. Paid orders can be lost: if a customer pays, then changes their bag and places a new order, the first order expires without a Bakong check. Nothing can check it again, so the money arrives with no signal, and paying again after expiry can charge them twice.
2. Seed overwrites admin edits: re-running db:seed resets stock, price and created_at on seeded products, even though CLAUDE.md calls it safe.
3. Products can look sold out indefinitely: abandoned orders only release stock when someone places an order or re-checks that payment.
4. Customers can lose their reservation: a customer holding the last unit sees it as sold out after reloading, and can't get back to their QR.
5. Delivery changes are dropped: re-placing the same bag with a corrected address reuses the old order and keeps the old address.
6. Removed products block checkout: a deleted or renamed product stays in the bag cookie, where the customer can't see or remove it, and checkout fails.
7. Prices can display wrongly: formatPrice rounds to whole dollars, so $145.50 would display as about $146 while KHQR charges $145.50. Admin price editing makes this reachable.
8. Other Bakong errors may count as unpaid: this breaks the project's rule, though it's unconfirmed whether Bakong actually returns such responses.
9. Possible open redirect: safeRedirect doesn't reject tabs or newlines, so it may allow one. Test this before admin login relies on it.

Recommended build order

1. Prepare: make the seed insert-only and fix problems 5–7. Commit the current work too, because the route group moves many files and most of the app is uncommitted.
2. Admin access and layout: add the role, guard and (store)/admin layouts.
3. Orders: build the list, detail view and re-check, with created_at and related indexes. This addresses the lost-payment problem for staff.
4. Products and categories: build editing, archiving and slug rules. Treat slugs as permanent once created.
5. Stock: add adjustments and the audit log.
6. Later: add fulfilment as a separate column, then paid_late resolution, cancel and refund using the stock rules the orders report set out. Add customer order history so customers can recover their own orders.

Decisions for you

1. Do you want sizes before admin? Shoes and jackets are sold without sizes today. Adding them moves stock to the variant and changes the bag and order items, so decide this first. If they're coming soon, I'd add them before building the stock screens.
2. Should admins be able to mark an order paid by hand? I recommend no for the first version, because it breaks the rule that Bakong is the only proof of payment.
3. What should non-admins see at /admin? I recommend a 404 for signed-in non-admins and a sign-in redirect for signed-out visitors, so an expired admin session isn't a dead end.
4. How should abandoned orders release stock? CLAUDE.md rules out a cron unless you ask for one. I recommend a small scheduled job that only updates the database and never calls Bakong, which fixes problem 3 directly.
5. Where will product images live, and where will you host? I recommend external object storage if the host is serverless, since files saved to public/ won't persist there. The hosting target isn't in the repo, and uploads also need CSP, image host and body-size changes.
6. What should happen to the test orders in the dev database? One is marked paid with a mock hash and would show up in admin lists and revenue. If production uses a separate database, this only affects dev; otherwise I'd clean them up first.