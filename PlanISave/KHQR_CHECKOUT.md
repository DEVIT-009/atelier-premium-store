# Bakong KHQR checkout for Atelier Store (Next.js 16)

Status: **implemented 2026-11-05.** Tested end to end against a local mock of the Bakong API; not yet tested against the real Bakong API.
Source studied: [DEVIT-009/khqr-with-flask](https://github.com/DEVIT-009/khqr-with-flask), the Python `bakong-khqr` lib, and the official NBC `bakong-khqr` npm SDK. General knowledge is in the `khqr-bakong` skill.

## What's done (read carefully)

### Built
- **Database:** `orders` and `order_items` tables, with an `order_status` enum of `pending | paid | expired | paid_late`. The first version was migration `0002`; later migrations (`0004`, `0005`) changed the delivery fields.
- **QR building:** our own KHQR encoder (`src/lib/khqr/encode.ts`). There's no third-party KHQR SDK. It reproduces the official NBC sample checksum (`58D8`).
- **Bakong client** (`src/lib/khqr/bakong.ts`): one function, `checkTransactionByMd5`. It calls the official NBC API directly, not the `api.khqr.dev` relay.
- **Order logic** (`src/lib/orders.ts`): create an order with stock reserved, check payment, expire orders and release stock, read a receipt.
- **Checkout:** the `placeOrder` and `checkPayment` server actions, the KHQR popup with its check button, a sign-in gate on `/checkout`, and a real receipt on `/checkout/thank-you`.
- **QR image** (`src/lib/khqr/image.ts`): a small round Bakong icon in the centre, kept only because the decode tests passed (details below).
- **Docs:** this file, the `khqr-bakong` skill (`.claude/skills/khqr-bakong/`), and the KHQR section in `CLAUDE.md`.

### Behaviour you must understand
1. **We only learn about a payment when the customer clicks.** If they pay and close the popup without clicking, the money is in your Bakong account but the order stays `pending`. After the QR expires it becomes `expired` and its stock goes back on sale. You'll have to match these payments manually (Bakong app statement vs order reference) until a staff view or reconciliation job exists.
2. **`paid_late` means money arrived for an order whose stock was already released.** Staff must check whether the piece is still available, and fulfil or refund it. Refunds are manual bank transfers; Bakong has no refund API.
3. **Stock is reserved when "Place order" is clicked, not when the customer pays.** An unpaid QR holds the pieces for `KHQR_EXPIRATION_MINUTES` (default 15). Expired orders are released the next time anyone places an order. There's no timer, so the catalogue can show reserved stock as unavailable for a little longer than 15 minutes.
4. **The same customer and the same bag reuse the same QR** while it's still valid, so a payment already made isn't lost. A different bag releases their old reservations and creates a new order.
5. **The amount on the QR is exactly the database total**, with complimentary shipping and no tax. If you add shipping fees or tax later, change `createOrder` in `src/lib/orders.ts`, not the UI.
6. **A payment that doesn't match the order** (wrong amount, account or currency) is never marked paid. It's logged with `console.error("KHQR payment does not match order", …)`, and the customer is told to contact Client Services.
7. **If Bakong is down, or the token is expired or rejected**, the customer only sees "We couldn't confirm your payment right now" and nothing changes. Watch the server logs for `Bakong check failed`. An expired token looks exactly like "nobody can confirm payment".
8. **Checkout requires sign-in.** Guest checkout isn't supported.
9. **Users can't be deleted while they have orders:** `orders.user_id` uses `ON DELETE restrict`, on purpose, because orders are financial records.

### Things that happened during the build
- **Migrations:** `npm run db:migrate` (drizzle-kit) exited with code 1 and no error message on this machine. Migration `0002` was applied with drizzle-orm's HTTP migrator against the same `./drizzle` folder instead. If drizzle-kit keeps failing silently, that's the workaround.
- **Test data was left in the database:** test users `khqr-test+…@example.com`, about 5 test orders (one `paid` with a mock Bakong hash starting `mock…`), and the Chevron Chain Shoulder Bag's stock is 1 lower because of that test "paid" order. One test order (`AT8HD8J69X`) was created on your own dev server with your real `.env`, and two real Bakong lookups were sent for it. Delete or keep these as you prefer.
- **Builds need a working database connection** (prerendered catalogue pages). DNS lookups to the Neon host failed several times during this work. A failing `npm run build` with `fetch failed` / `ENOTFOUND` is the network, not the code.
- **`.env.example` wasn't updated:** permission settings block access to it. Copy the Environment block below into it by hand.

### QR icon decision (don't change casually)
- Final settings: icon at **12% of the QR width**, error correction **Q**, **8 px per square** (`scale: 8`), shown with `image-rendering: pixelated`.
- Tested on 61 random orders × 7 sizes/blur levels with two decoders (jsQR and ZXing). With the icon: jsQR 424/427, ZXing 390/427. Plain QR: 424/427 and 383/427. The icon doesn't make it harder to read.
- **Rejected:** a 16% icon (jsQR dropped to 246/280) and level H (denser, worse when small).
- Rule: if the icon or these settings ever change, re-run the decode comparison. If it scans worse than the plain QR, keep the plain QR.

## How we know the customer paid

Bakong never notifies us; there's no webhook. Each KHQR has an MD5 (hash of the exact QR string) saved on the order. **Only when the customer clicks "I've paid — check payment"** in the QR popup does the server call Bakong `check_transaction_by_md5` once:

- `responseCode 0` + data → verify `toAccountId`, `currency` (USD) and `amount` (= order total) → conditional `pending → paid`, store `bakong_hash` (UNIQUE), clear the bag, redirect to `/checkout/thank-you?order=…`.
- Not found → "We haven't received your payment yet" (or "expired" once the QR lifetime has passed: the order expires and its reserved stock goes back).
- Found, but the amount, account or currency doesn't match → "contact Client Services" (logged, never marked paid).
- Bakong or the database is unreachable → "try again in a moment" (nothing changes).

Decision: **no polling and no background job**. Trade-off: a customer who pays and closes the popup without clicking leaves the order `pending`/`expired` in our database, even though the money is in the Bakong account. When they click later, the payment is found: `pending` → `paid`, `expired` → `paid_late` (staff confirm stock or refund).

## Flow

1. `/checkout` requires sign-in (`redirect` to `/sign-in?redirectTo=/checkout`), and the email is prefilled.
2. "Place order" → server action `placeOrder`:
   - Validate the form.
   - Expire overdue pending orders (no Bakong call).
   - Re-price the bag from the database (uncached).
   - Reuse this customer's unexpired QR if the bag is identical. Otherwise release their old reservations and, in one `db.batch` transaction, insert the order and items and reserve stock. The `stock >= 0` CHECK aborts it on oversell.
   - Build the KHQR and render a PNG data URL.
3. The KHQR popup (native `<dialog>`) shows the merchant, the exact amount, the order reference, a countdown, "Save QR image" and the check button.
4. The check button → server action `checkPayment(orderId)`, as described above.

## Files

| File | What |
|---|---|
| `src/db/schema/orders.ts` | `order_status` enum, `orders`, `order_items` (+ relations); migration `drizzle/0002_steady_old_lace.sql` |
| `src/lib/khqr/encode.ts` | KHQR encoder (tag-length-value fields, CRC-16, MD5), verified against the NBC sample |
| `src/lib/khqr/image.ts` | QR PNG with a small round Bakong icon (12% width, error correction Q, 8 px per square). Decode-tested on 61 orders with jsQR + ZXing: reads as well as the plain QR. The 16% size and level H scanned worse. Falls back to the plain QR on any error |
| `src/lib/khqr/bakong.ts` | `checkTransactionByMd5`; 401/403/429/5xx/timeouts → `BakongUnavailableError`, never "unpaid" |
| `src/lib/khqr/config.ts` | env reading and validation |
| `src/lib/orders.ts` | `createOrder`, `checkOrderPayment`, `getOrderForUser`, stock release |
| `src/app/checkout/actions.ts` | `placeOrder`, `checkPayment` |
| `src/components/checkout/khqr-checkout.tsx` | form wrapper, Place order button, KHQR dialog |
| `src/app/checkout/page.tsx` | sign-in gate, wired form |
| `src/app/checkout/thank-you/page.tsx` | real receipt for the owner; unpaid or unknown orders → `/bag` |

## Environment

```env
# Bakong KHQR (server only)
BAKONG_TOKEN=            # developer token from api-bakong.nbc.gov.kh; reportedly expires every ~90 days
BAKONG_ACCOUNT_ID=       # receiving account, e.g. atelier@aclb
MERCHANT_NAME=           # ASCII, max 25, shown in the banking app
MERCHANT_CITY=           # ASCII, max 15, e.g. Phnom Penh
MERCHANT_PHONE=          # optional
STORE_LABEL=             # optional, max 25
TERMINAL_LABEL=          # optional, max 25, e.g. Web
KHQR_EXPIRATION_MINUTES=15
BAKONG_API_URL=          # optional; defaults to https://api-bakong.nbc.gov.kh/v1
```

## Still to do
- Real-money test with a banking app (smallest product price, or a temporary test product).
- Test that Bakong is reachable from the hosting region (reportedly Cambodian IPs only).
- Token renewal reminder (`/v1/renew_token`).
- Staff view of `pending`/`expired` orders whose payment may have arrived without a click, and of `paid_late` orders. Logs carry the reference for now.
- Scan the QR (with the icon) using real banking apps (ABA, ACLEDA, Bakong), from the screen and from the saved image.
- Copy the Environment block into `.env.example`.
- Decide what to do with the test data listed above.
- The Bakong logo belongs to the National Bank of Cambodia. Check its KHQR brand guidelines if the bank reviews the store.
