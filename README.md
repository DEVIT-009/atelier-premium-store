# Atelier Store

An eCommerce store with Bakong KHQR checkout for customers in Cambodia, and an admin area for running the shop.

## Features

**Storefront**

- Homepage, New In, Women, Men and staff-managed category pages
- Product pages, search, journal and client services (FAQ, shipping, returns)
- Bag and checkout with delivery details
- Accounts with email and password, plus order history

**Payments**

- Checkout by Bakong KHQR, which every Cambodian banking app can scan
- Stock is reserved when an order is placed and released when its QR expires
- Payment is checked against Bakong when the customer or staff ask, and the account, currency and amount must all match

**Admin (`/admin`)**

- Overview of sales and work waiting on staff
- Orders: status, fulfilment, cancellations and recording refunds
- Products: details, status, stock adjustments and images
- Categories: store menu and homepage placement
- Users: sign out everywhere, block and unblock, grant and remove admin access

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Neon Postgres, Drizzle ORM |
| Auth | Better Auth (email and password) |
| Payments | Bakong KHQR |
| Images | Cloudinary, sharp |

## Getting started

You need Node.js 22.9 or later, a [Neon](https://neon.tech) database, a [Cloudinary](https://cloudinary.com) account and, to take payments, a [Bakong developer token](https://api-bakong.nbc.gov.kh).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate           # create the tables
npm run db:seed              # add the sample catalogue
npm run dev                  # http://localhost:3000
```

### Create the first admin

Register an account through the site, then promote it directly in the database, matching both `id` and `email`:

```sql
UPDATE "user" SET role = 'admin' WHERE id = '<user id>' AND email = '<email>';
```

After that, admins can grant access from `/admin/users`.

## Environment variables

**Required**

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Session signing secret; generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Origin the site is served from |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account; also needed at build time |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret; server only |
| `BAKONG_TOKEN` | Bakong developer token; server only, reportedly expires about every 90 days |
| `BAKONG_ACCOUNT_ID` | Receiving account, such as `atelier@aclb` |
| `MERCHANT_NAME` | ASCII, up to 25 characters |
| `MERCHANT_CITY` | ASCII, up to 15 characters |
| `CRON_SECRET` | Protects the order expiry route, which stays closed without it |

**Optional**

| Variable | Purpose |
| --- | --- |
| `MERCHANT_PHONE` | Merchant phone number on the QR |
| `STORE_LABEL` | Store label on the QR, up to 25 characters |
| `TERMINAL_LABEL` | Terminal label on the QR, up to 25 characters |
| `KHQR_EXPIRATION_MINUTES` | QR lifetime in minutes, default 15 |
| `BAKONG_API_URL` | Defaults to the live Bakong API; point it at a local mock to test the paid flow |
| `CLOUDINARY_PRODUCT_FOLDER` | Defaults to `atelier-store/products` |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check |
| `npm run db:generate` | Generate SQL migrations from `src/db/schema` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema directly; throwaway experiments only |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Insert catalogue rows missing by slug; never changes existing rows |
| `npm run auth:generate` | Regenerate `src/db/schema/auth.ts` from the Better Auth config |

There is no automated test suite yet.

## Project structure

```
src/
├── app/
│   ├── (store)/      # storefront routes, with the header and footer
│   ├── admin/        # admin area, with its own header
│   └── api/          # Better Auth handler and order expiry cron
├── components/       # UI, grouped by feature
├── db/
│   └── schema/       # one file per domain; auth.ts is generated
├── lib/              # data access and business logic
│   └── khqr/         # QR building and the Bakong API client
└── pages/            # only for the styled 400 error page
drizzle/              # SQL migrations
```

`CLAUDE.md` documents the architecture and conventions in detail.

## Deployment

The app runs anywhere that can run a Node.js server: `npm run build`, then `npm run start`.

- **Run migrations and seed before building.** `next build` needs a reachable database with at least one active product, and the Cloudinary cloud name.
- **Set `BETTER_AUTH_URL` to the real origin.** Any other host, such as an ngrok tunnel, must be added to `trustedOrigins` in `src/lib/auth.ts`.
- **Schedule order expiry about every 5 minutes**, so abandoned QRs release their stock:

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/expire-orders
  ```

- **Test Bakong from your hosting region.** The Bakong API reportedly accepts only Cambodian IPs; this hasn't been confirmed.
