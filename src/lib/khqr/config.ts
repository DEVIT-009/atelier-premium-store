// Bakong KHQR settings, read from the environment on first use (server only).
// See .env.example. The token never leaves the server.

export type KhqrConfig = {
  token: string;
  apiUrl: string;
  accountId: string; // receiving Bakong account, e.g. "atelier@aclb"
  merchantName: string; // KHQR tag 59: ASCII, max 25
  merchantCity: string; // KHQR tag 60: ASCII, max 15
  merchantPhone?: string;
  storeLabel?: string;
  terminalLabel?: string;
  expirationMinutes: number;
};

let cached: KhqrConfig | undefined;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing from the environment (see .env.example)`);
  return value;
}

function optional(name: string) {
  return process.env[name]?.trim() || undefined;
}

function ascii(name: string, value: string, max: number) {
  if (!/^[\x20-\x7E]+$/.test(value)) throw new Error(`${name} must be plain ASCII`);
  if (value.length > max) throw new Error(`${name} must be at most ${max} characters`);
  return value;
}

export function getKhqrConfig(): KhqrConfig {
  if (cached) return cached;

  const accountId = required("BAKONG_ACCOUNT_ID");
  if (!/^[^@\s]{1,31}@[^@\s]+$/.test(accountId) || accountId.length > 32) {
    throw new Error("BAKONG_ACCOUNT_ID must look like name@bank (max 32 characters)");
  }

  const minutes = Number(optional("KHQR_EXPIRATION_MINUTES") ?? 15);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 * 24) {
    throw new Error("KHQR_EXPIRATION_MINUTES must be a whole number from 1 to 1440");
  }

  const storeLabel = optional("STORE_LABEL");
  const terminalLabel = optional("TERMINAL_LABEL");

  cached = {
    token: required("BAKONG_TOKEN"),
    apiUrl: (optional("BAKONG_API_URL") ?? "https://api-bakong.nbc.gov.kh/v1").replace(/\/+$/, ""),
    accountId,
    merchantName: ascii("MERCHANT_NAME", required("MERCHANT_NAME"), 25),
    merchantCity: ascii("MERCHANT_CITY", required("MERCHANT_CITY"), 15),
    merchantPhone: optional("MERCHANT_PHONE"),
    storeLabel: storeLabel && ascii("STORE_LABEL", storeLabel, 25),
    terminalLabel: terminalLabel && ascii("TERMINAL_LABEL", terminalLabel, 25),
    expirationMinutes: minutes,
  };
  return cached;
}
