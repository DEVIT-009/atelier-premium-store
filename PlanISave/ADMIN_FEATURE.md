Atelier Store admin: feature-by-feature plan                                                                │
│                                                                                                             │
│ Context                                                                                                     │
│                                                                                                             │
│ The store has no admin side: staff can't see orders, resolve late payments, or edit the catalogue without touching the database. This plan splits admin into small features you can pick one at a time. Each one ships and can be reviewed alone. Product variants stay out of scope, so stock remains per product.          │
│                                                                                                             │
│ Before Feature 1: commit the current fixes, run npm run build with a strong BETTER_AUTH_SECRET, and test the order flows against a Bakong mock.                                                                      │
│                                                                                                             │
│ How to choose                                                                                               │
│                                                                                                             │
│ Features 1 and 2 are required first. After that, pick any feature whose "Needs" are done.                   │
│                                                                                                             │
│ ┌───────────┬───────────────────────────────────┬──────────────────────┬───────────────┬──────┐             │
│ │     #     │              Feature              │        Needs         │   Migration   │ Size │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 1         │ Admin access                      │ none                 │ Yes           │ S    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 2         │ Admin layout                      │ 1                    │ No            │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ Orders    │                                   │                      │               │      │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 3         │ Order list                        │ 2                    │ Yes (indexes) │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 4         │ Order detail and payment re-check │ 3                    │ No            │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 5         │ Fulfilment tracking               │ 4                    │ Yes           │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 6         │ Late payment, cancel and refund   │ 4                    │ Yes           │ L    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ Catalogue │                                   │                      │               │      │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 7         │ Product list and editing          │ 2                    │ No            │ L    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 8         │ Product archiving                 │ 7                    │ Yes           │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 9         │ Category management               │ 7                    │ No            │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 10        │ Stock adjustments and history     │ 7                    │ Yes           │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 11        │ Image uploads                     │ 7                    │ No            │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 12        │ Database-driven navigation        │ 9                    │ Yes           │ M    │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ Overview  │                                   │                      │               │      │             │
│ ├───────────┼───────────────────────────────────┼──────────────────────┼───────────────┼──────┤             │
│ │ 13        │ Dashboard                         │ 3 (10 for low stock) │ No            │ S    │             │
│ └───────────┴───────────────────────────────────┴──────────────────────┴───────────────┴──────┘             │
│                                                                                                             │
│ Recommended order: 1, 2, 3, 4, then 7, 10, 8. Orders come first because paid orders are currently invisible to staff.                                                                                                   │
│                                                                                                             │
│ Rules for every feature                                                                                     │
│                                                                                                             │
│ - Call requireAdmin() first in every admin page component, Server Action and data function, before any try. A layout check alone doesn't protect anything.                                                            │
│ - Keep admin reads uncached and in src/lib/admin/. Never read the session inside "use cache".               │
│ - After catalogue writes, call updateTag("products") so the admin sees the change straight away.            │
│ - Change order status only with WHERE status = <expected>, check the row count, and change stock in the same statement (the expireOrders CTE pattern in src/lib/orders.ts).                                       │
│ - Never rebuild khqr or khqr_md5, or change an order's total or items once it has a QR.                     │
│ - Show admin money with formatPriceExact (src/lib/format.ts).                                               │
│ - Schema changes go db:generate, review the SQL, then db:migrate.                                           │
│                                                                                                             │
│ ---                                                                                                         │
│                                                                                                             │
│ Foundation                                                                                                  │
│                                                                                                             │
│ 1. Admin access                                                                                             │
│                                                                                                             │
│ You get: a safe way to mark a user as admin, with no public way to become one.                              │
│ - Add role to user.additionalFields in src/lib/auth.ts (input: false, default "user"), keep nextCookies() last, then run auth:generate and a migration.                                                             │
│ - Add requireAdmin() in new src/lib/admin.ts, built on getSession(). Don't add the Better Auth admin plugin, a proxy or the cookie cache.                                                                      │
│ - Promote the first admin by hand with SQL, matching both id and email. No app code writes role.            │
│                                                                                                             │
│ Decision: non-admins at /admin. Recommended: signed-out visitors go to sign-in, signed-in non-admins get a 404.                                                                                                        │
│                                                                                                             │
│ Verify: sign-up with role: "admin" stores user; update-user with role returns 400; a non-admin can't open /admin or call an admin action directly.                                                                    │
│                                                                                                             │
│ 2. Admin layout                                                                                             │
│                                                                                                             │
│ You get: an /admin area with its own navigation, sign-out button, and no store header or footer.            │
│ - Slim src/app/layout.tsx to html, body and fonts. Move storefront routes and (auth) into src/app/(store)/ with the header and footer in its layout. URLs don't change.                                              │
│ - Update imports of @/app/{account,bag,checkout}/actions and check outputFileTracingIncludes["/checkout"] in next.config.ts.                                                                                        │
│ - Add src/app/admin/layout.tsx and a small AdminNavLink that sets aria-current. Add robots: { index: false }. Reuse SignOutButton.                                                                                   │
│ - Extract only what admin needs: PendingButton (out of bag/), Breadcrumb, PageHeader, EmptyState. Reuse the Suspense-plus-guard structure from src/app/account/page.tsx.                                              │
│                                                                                                             │
│ Verify: every store page looks and works as before, including a 404 page; /admin shows only the new layout, on mobile too.                                                                                              │
│                                                                                                             │
│ ---                                                                                                         │
│                                                                                                             │
│ Orders                                                                                                      │
│                                                                                                             │
│ 3. Order list                                                                                               │
│                                                                                                             │
│ You get: every order in one table, with filters for what needs attention: paid_late, paid, overdue pending, recently expired.                                                                                           │
│ - Add listOrdersForAdmin({ status, q, cursor }) with paging on (created_at, id) and search by reference or email.                                                                                                    │
│ - Add an index on (status, created_at) and any others the queries need.                                     │
│ - Build DataTable and StatusBadge, with filters kept in the URL (the searchParams pattern in checkout/thank-you/page.tsx). Show "overdue" from expires_at, since expiry is lazy.                       │
│                                                                                                             │
│ Decision: test orders in the dev database, including one marked paid with a mock hash, will appear here. Recommended: clean them up only if production shares this database.                                         │
│                                                                                                             │
│ Verify: filters, search and paging work with seeded test orders.                                            │
│                                                                                                             │
│ 4. Order detail and payment re-check                                                                        │
│                                                                                                             │
│ You get: a full order page with customer, items, delivery and payment details, plus a "Re-check payment" button that finds payments customers never confirmed.                                                       │
│ - Add getOrderForAdmin(id).                                                                                 │
│ - Add an admin Server Action that reuses settleOrder in src/lib/orders.ts, with one Bakong call per click. Don't clear any bag from it, and keep bag clearing in the customer action.                                │
│ - Show mismatch details (account, currency, amount) and show "Bakong unavailable" separately from "unpaid". │
│                                                                                                             │
│ Decision: manual "mark paid". Recommended: no, Bakong stays the only proof. If you want it later, it becomes a separate labelled path with a reason and audit trail.                                             │
│                                                                                                             │
│ Verify: with the Bakong mock, re-check moves pending to paid and expired to paid_late; mismatch and outage change nothing.                                                                                             │
│                                                                                                             │
│ 5. Fulfilment tracking                                                                                      │
│                                                                                                             │
│ You get: staff can move paid orders through preparation to shipped or collected.                            │
│ - Add a separate fulfilment_status column: unfulfilled | processing | shipped | delivered, or ready_for_pickup | collected for pickup. Add an optional tracking reference.                              │
│ - Allow changes only WHERE status = 'paid' AND fulfilment_status = <expected>. order_status and the settlement code stay untouched.                                                                           │
│                                                                                                             │
│ Decision: the app sends no email, so customers aren't told about changes automatically. Recommended: staff contact them by hand for now.                                                                               │
│                                                                                                             │
│ Verify: invalid and stale transitions are rejected; unpaid orders can't be fulfilled.                       │
│                                                                                                             │
│ 6. Late payment, cancel and refund                                                                          │
│                                                                                                             │
│ You get: a way to resolve paid_late orders and to cancel or refund orders, with a record of who did what.   │
│ - Add order_events (order, actor, from, to, reason, time).                                                  │
│ - Add cancelled and refunded statuses, plus refund reference and amount. Update checkOrderPayment in the same change, because new statuses affect it.                                                              │
│ - Stock rules:                                                                                              │
│   - Accept paid_late: re-reserve stock in one CTE. If stock has run out, offer a refund.                    │
│   - Refund paid_late: never release stock, because it was already released.                                 │
│   - Cancel pending: re-check Bakong first, then release.                                                    │
│   - Refund an unshipped paid order: release once.                                                           │
│   - Refund a shipped paid order: staff choose whether to restock.                                           │
│ - Refunds are manual bank transfers. The app only records them.                                             │
│ - Fix the misleading paid_late copy on the thank-you page here.                                             │
│                                                                                                             │
│ Verify: test each row of the stock rules; running the same action twice changes stock only once.            │
│                                                                                                             │
│ ---                                                                                                         │
│                                                                                                             │
│ Catalogue                                                                                                   │
│                                                                                                             │
│ 7. Product list and editing                                                                                 │
│                                                                                                             │
│ You get: create and edit products: name, description, details, price, category, department, badge and image URL.                                                                                                        │
│ - Add uncached admin reads, and writes that call updateTag("products").                                     │
│ - Extend src/components/form/field.tsx with field errors, TextareaField and { value, label } options. Add fieldErrors to the form state, following checkout/actions.ts and khqr-checkout.tsx.                       │
│ - Validate slugs with the bag's pattern (^[a-z0-9-]{1,200}$), and treat them as permanent once created.     │
│ - Accept image URLs only from hosts in remotePatterns, and remove duplicate detail lines.                   │
│ - Stock is set once at creation, then changes only through Feature 10.                                      │
│ - Add zod as a direct dependency for validation.                                                            │
│                                                                                                             │
│ Decision: images. Recommended: a URL field for now, with uploads as Feature 11.                             │
│                                                                                                             │
│ Verify: edits appear on the storefront immediately; a duplicate slug shows a form error; order history keeps its original names and prices.                                                                        │
│                                                                                                             │
│ 8. Product archiving                                                                                        │
│                                                                                                             │
│ You get: take a product off sale without losing order history. Hard delete is impossible once a product has been ordered.                                                                                               │
│ - Add products.status: draft | active | archived, default active. Decide how drafts handle the required image in the same migration.                                                                              │
│ - Filter to active in the storefront reads in src/lib/products.ts and in the uncached query in createOrder. │
│ - Offer hard delete only when a product has no order items, and still handle the database's refusal.        │
│ - generateStaticParams must keep returning at least one param, or next build fails.                         │
│                                                                                                             │
│ Verify: an archived product disappears from listings and from bags; a QR already issued still settles.      │
│                                                                                                             │
│ 9. Category management                                                                                      │
│                                                                                                             │
│ You get: create, rename and delete categories.                                                              │
│ - Add a reserved-slug list covering static routes and admin, so a category can't be saved at an unreachable URL.                                                                                                      │
│ - Block delete while products use the category, and show the product count.                                 │
│ - Add getCategories() under the products cache tag.                                                         │
│ - Warn that bags, shoes and jewelry are hard-coded in navigation until Feature 12.                          │
│                                                                                                             │
│ Verify: reserved slugs are rejected; delete is blocked with products attached; a new category page works right after creation.                                                                                       │
│                                                                                                             │
│ 10. Stock adjustments and history                                                                           │
│                                                                                                             │
│ You get: add or remove stock with a required reason, and see who changed what.                              │
│ - Add stock_movements (product, delta, stock_after, reason, note, actor, time).                             │
│ - Write the adjustment and the audit row in one CTE, guarded by stock + delta >= 0. Don't offer an absolute "set stock", because it can erase reservations or oversell.                                               │
│ - Show available and held quantities, and label the number clearly as "available for sale".                 │
│                                                                                                             │
│ Verify: concurrent adjustments and checkouts add up correctly; an adjustment below zero is rejected with no audit row.                                                                                                  │
│                                                                                                             │
│ 11. Image uploads                                                                                           │
│                                                                                                             │
│ You get: upload files instead of pasting URLs.                                                              │
│ - Needs a storage provider. Re-encode uploads with sharp, use unique filenames, and update remotePatterns and the CSP. Set serverActions.bodySizeLimit if uploads go through the server.                            │
│ - Update the "Images courtesy of Unsplash" footer text.                                                     │
│                                                                                                             │
│ Decision: which provider, which depends on your host.                                                       │
│                                                                                                             │
│ Verify: the uploaded image renders on product pages, and the old image isn't served from cache after replacement.                                                                                                │
│                                                                                                             │
│ 12. Database-driven navigation                                                                              │
│                                                                                                             │
│ You get: the header and homepage categories follow what's in admin rather than being hard-coded.            │
│ - Add category position and a show-in-nav flag, and read them in site-header, mobile-menu and collection-grid. Women, Men and New In stay fixed.                                                        │
│                                                                                                             │
│ Decision: homepage collection images: a category image column, or keep them as curated content.             │
│                                                                                                             │
│ Verify: adding, hiding and reordering categories updates the store; there are no dead links.                │
│                                                                                                             │
│ ---                                                                                                         │
│                                                                                                             │
│ Overview                                                                                                    │
│                                                                                                             │
│ 13. Dashboard                                                                                               │
│                                                                                                             │
│ You get: an /admin landing page with counts that link to filtered lists: late payments, orders to fulfil, overdue QRs and, with Feature 10, low stock.                                                                │
│ - Revenue totals should exclude test orders, and it would be read-only. It must not call Bakong on page load, since the project rules out automatic checks.                                                       │
│                                                                                                             │
│ Verify: counts match the filtered lists.                                                                    │
│                                                                                                             │
│ Not planned                                                                                                 │
│                                                                                                             │
│ Product variants, automatic Bakong reconciliation, email notifications, MFA for admins, multiple staff roles and customer-facing order history. Each can be added as a new feature if you want it.                 │
│                                                                                                             │
│ Testing each feature                                                                                        │
│                                                                                                             │
│ The project has no test framework, so each feature gets npx tsc --noEmit, npm run lint, npm run build, and its Verify steps run in the browser, using the BAKONG_API_URL mock for anything touching payments.


--------------------------------------------------------------------------------------------------------------------------

# User Management (Before Feature 13)

**Status:** Capability list only, for the owner to choose from. Nothing is built yet.

**What exists today:**

Users sign up with email and password, with no verification and no password reset.

The `user.role` field is either `"user"` or `"admin"`, and an admin can only be promoted manually through SQL.

Sessions are stored in the database with no cookie cache, so deleting a session row signs that device out immediately.

Orders, order_events, and stock_movements reference `user.id` with ON DELETE RESTRICT, so a user who has ordered or acted as staff cannot be hard-deleted.

## A. See Customers (Core)

**1. User List**

Display the following information:

- Name
- Email
- Role
- Sign-up date
- Order count
- Total paid
- Last sign-in

Include search by name or email, filtering by role or blocked status, and pagination by ID, following the existing order list pattern.

**2. User Detail**

Display:

- Customer profile
- Their orders, linked to the order pages
- Active sessions, including device information from the user agent, IP address, and last active time
- Staff actions taken on that user

## B. Protect the Store (Core)

**3. Sign a User Out Everywhere**

Delete all session rows belonging to that user.

Useful when a device is stolen or suspicious activity is detected.

**4. Block and Unblock a Customer**

Add `blocked_at` and `reason` fields.

A blocked user:

- Cannot sign in because a Better Auth hook refuses the session.
- Cannot place orders because the createOrder function also checks their blocked status.
- Has all existing sessions signed out automatically.
- Keeps their existing orders and history.

This is the safe alternative to deleting a customer.

**5. Audit Trail**

Create a `user_events` row for every staff action performed on a user.

Record the following information:

- Who performed the action
- What action was performed
- Why it was performed
- When it happened

Display these events on the user detail page, following the existing order_events pattern.

## C. Staff Access (Optional)

**6. Promote and Demote Admins in the App Instead of SQL**

This changes the existing rule that no application code writes to the role field.

It requires several safeguards:

- You cannot demote yourself.
- The last remaining admin cannot be demoted.
- Promoting someone to admin requires a confirmation step and a reason.

Because sign-up has no email verification, only promote accounts you know belong to staff.

**7. Admin List**

Display everyone who has admin access and when they received that access.

## D. Account Fixes (Optional, the App Sends No Email)

**8. Edit Customer Name or Email**

Allow staff to update a customer's name or email when requested.

Email addresses must remain unique.

Since there is no email verification, staff are responsible for confirming that the requested change is legitimate.

**9. Set a Temporary Password**

Allow staff to set a temporary password for customers who are locked out because there is no password reset email.

Staff communicate the temporary password directly to the customer.

All existing sessions belonging to that customer must be signed out.

Use Better Auth's `ctx.password.hash` to ensure the password hash format remains correct.

## E. Removal and Privacy (Optional)

**10. Delete a User**

Allow deletion only when the user has no orders and no staff history.

Sessions and accounts will be deleted automatically through cascading database rules.

**11. Anonymise Instead of Delete**

For users with existing orders who submit privacy requests:

- Replace their name and email with anonymous values.
- Delete their sessions.
- Delete their password.
- Keep their orders for the books.
- Clear order receiver information as well.

## Not Recommended Now

- **Better Auth Admin Plugin:** Its endpoints exceed what is needed, and CLAUDE.md already rules it out.
- **Customer Impersonation:** Can be considered as a future feature.
- **Multiple Staff Roles or Permissions:** Can be added later.
- **Multi-Factor Authentication (MFA):** Can be added later.
- **Bulk Export:** Not necessary for the current scope.
- **Customer-Facing Order History:** This belongs to storefront development, not admin management.
- **Self-Service Account Editing:** This also belongs to storefront development.

## Suggested Scope for the First Version

Implement the following five features first:

1. User List
2. User Detail
3. Sign a User Out Everywhere
4. Block and Unblock Customers
5. Audit Trail

Add features 6 and 7 if more than one person manages the store.

Implement features 8 through 11 only when actual customer requests arise.

## Not Planned

The following features are not included in the current plan:

- Product variants
- Automatic Bakong reconciliation
- Email notifications
- MFA for admins
- Multiple staff roles
- Customer-facing order history

Each can be introduced as a new feature if needed.

## Testing Each Feature

The project currently has no test framework.

Therefore, each feature must pass the following checks:

1. Run `npx tsc --noEmit` to check TypeScript errors.
2. Run `npm run lint` to check code quality.
3. Run `npm run build` to verify the production build.
4. Complete the feature's Verify steps manually in the browser.
5. Use the BAKONG_API_URL mock for anything that interacts with payments.