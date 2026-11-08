"use server";

import { redirect } from "next/navigation";
import { MAX_QUANTITY, readBagEntries, writeBagEntries } from "@/lib/bag";
import { getProductBySlug } from "@/lib/products";

// Setting the cookie re-renders the current page, so no refresh() is needed

export async function addToBag(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product || product.stock <= 0) return;

  const entries = await readBagEntries();
  const existing = entries.find((entry) => entry.slug === slug);
  const limit = Math.min(product.stock, MAX_QUANTITY);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, limit);
  } else {
    entries.push({ slug, quantity: 1 });
  }
  await writeBagEntries(entries);
  redirect("/bag");
}

export async function setBagQuantity(slug: string, quantity: number) {
  const entries = await readBagEntries();
  const entry = entries.find((item) => item.slug === slug);
  if (!entry || !Number.isInteger(quantity)) return;

  if (quantity < 1) {
    await writeBagEntries(entries.filter((item) => item.slug !== slug));
    return;
  }

  const product = await getProductBySlug(slug);
  if (!product) return;
  // Never pushes above stock, but lowering always works: a quantity held by the
  // customer's own reservation can exceed the stock left for everyone else
  const limit = Math.max(entry.quantity, product.stock);
  entry.quantity = Math.max(1, Math.min(quantity, limit, MAX_QUANTITY));
  await writeBagEntries(entries);
}

export async function removeFromBag(slug: string) {
  const entries = await readBagEntries();
  await writeBagEntries(entries.filter((entry) => entry.slug !== slug));
}
