const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(cents: number) {
  return usd.format(cents / 100);
}

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// To the cent, for amounts the customer must pay exactly (KHQR)
export function formatPriceExact(cents: number) {
  return usdExact.format(cents / 100);
}
