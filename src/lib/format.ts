const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Whole dollars read cleaner ("$145"), but cents are never rounded away ("$145.50")
export function formatPrice(cents: number) {
  return cents % 100 === 0 ? usd.format(cents / 100) : usdExact.format(cents / 100);
}

// To the cent, for amounts the customer must pay exactly (KHQR)
export function formatPriceExact(cents: number) {
  return usdExact.format(cents / 100);
}

// "145.50" to 14550 without going through a float; null if it isn't an amount
export function parseDollars(value: string) {
  const match = value.match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

// "Café Bag" to "cafe-bag"; empty if the text has no letters or numbers to use
export function slugFromText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Phnom_Penh",
});

// Store time, whichever region the server runs in
export function formatDateTime(date: Date) {
  return dateTime.format(date);
}

const dateOnly = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "Asia/Phnom_Penh",
});

// Store time, like formatDateTime
export function formatDate(date: Date) {
  return dateOnly.format(date);
}
