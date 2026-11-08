// Shopping bag. The cookie only holds slugs and quantities; prices and stock
// always come from the catalogue, so a tampered cookie can't change a total.
import { cookies } from "next/headers";
import { getReservedQuantities } from "@/lib/orders";
import { getProductsBySlugs, type Product } from "@/lib/products";
import { getSession } from "@/lib/session";

const BAG_COOKIE = "bag";
const MAX_LINES = 50;
export const MAX_QUANTITY = 10;

export type BagEntry = { slug: string; quantity: number };

export type BagLine = {
  product: Product;
  quantity: number; // requested
  stock: number; // what this customer can buy: product stock plus their own reservation
  available: number; // what can actually be bought: min(quantity, stock)
};

export type Bag = {
  lines: BagLine[];
  itemCount: number; // purchasable units
  subtotal: number; // USD cents, purchasable units only
};

function isEntry(value: unknown): value is BagEntry {
  if (typeof value !== "object" || value === null) return false;
  const { slug, quantity } = value as Record<string, unknown>;
  return (
    typeof slug === "string" &&
    /^[a-z0-9-]{1,200}$/.test(slug) &&
    Number.isInteger(quantity) &&
    (quantity as number) >= 1 &&
    (quantity as number) <= MAX_QUANTITY
  );
}

export async function readBagEntries(): Promise<BagEntry[]> {
  const raw = (await cookies()).get(BAG_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_LINES) : [];
  } catch {
    return [];
  }
}

export async function writeBagEntries(entries: BagEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(BAG_COOKIE);
    return;
  }
  store.set(BAG_COOKIE, JSON.stringify(entries.slice(0, MAX_LINES)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// Joins the cookie with the catalogue; lines for removed products are dropped
export async function getBag(): Promise<Bag> {
  const entries = await readBagEntries();
  const products = await getProductsBySlugs(
    entries.map((entry) => entry.slug).sort(),
  );
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const found = entries.flatMap(({ slug, quantity }) => {
    const product = bySlug.get(slug);
    return product ? [{ product, quantity }] : [];
  });

  // Product stock excludes the customer's own unpaid QR, which they can still
  // buy (createOrder counts it too). Looked up only when a line falls short, so
  // the bag count in the header adds no queries to a normal page.
  const isShort = found.some(({ product, quantity }) => quantity > product.stock);
  const session = isShort ? await getSession() : null;
  const reserved = session ? await getReservedQuantities(session.user.id) : new Map<string, number>();

  const lines = found.map(({ product, quantity }) => {
    const stock = product.stock + (reserved.get(product.id) ?? 0);
    return { product, quantity, stock, available: Math.min(quantity, stock) };
  });

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.available, 0),
    subtotal: lines.reduce(
      (sum, line) => sum + line.available * line.product.price,
      0,
    ),
  };
}
