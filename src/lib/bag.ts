// Shopping bag. The cookie only holds slugs and quantities; prices and stock
// always come from the catalogue, so a tampered cookie can't change a total.
import { cookies } from "next/headers";
import { getProductsBySlugs, type Product } from "@/lib/products";

const BAG_COOKIE = "bag";
const MAX_LINES = 50;
export const MAX_QUANTITY = 10;

export type BagEntry = { slug: string; quantity: number };

export type BagLine = {
  product: Product;
  quantity: number; // requested
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

  const lines = entries.flatMap(({ slug, quantity }) => {
    const product = bySlug.get(slug);
    if (!product) return [];
    return [{ product, quantity, available: Math.min(quantity, product.stock) }];
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
