// KHQR (EMVCo merchant-presented QR) encoder: tag + 2-digit length + value,
// ending with a CRC-16/CCITT-FALSE. Builds dynamic individual QRs (tag 29).
// Verified against the NBC SDK sample (CRC 58D8); see the khqr-bakong skill.
import { createHash } from "node:crypto";

export type KhqrCurrency = "USD" | "KHR";

export type KhqrInput = {
  accountId: string;
  merchantName: string;
  merchantCity: string;
  currency: KhqrCurrency;
  amount: string; // already formatted: "12.50" (USD) or "15000" (KHR)
  billNumber: string;
  mobileNumber?: string;
  storeLabel?: string;
  terminalLabel?: string;
  createdAtMs: number;
  expiresAtMs: number;
};

function tlv(tag: string, value: string) {
  if (value.length > 99) throw new Error(`KHQR tag ${tag} is too long`);
  return tag + String(value.length).padStart(2, "0") + value;
}

function limit(name: string, value: string | undefined, max: number) {
  if (value && value.length > max) throw new Error(`KHQR ${name} exceeds ${max} characters`);
}

export function crc16(payload: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Mobile numbers go in local form: "+855 12 345 678" → "012345678"
function localMobile(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("855")) digits = digits.slice(3);
  return digits && (digits.startsWith("0") ? digits : `0${digits}`);
}

export function formatKhqrAmount(minorUnits: number, currency: KhqrCurrency) {
  if (!Number.isInteger(minorUnits) || minorUnits <= 0) throw new Error("Invalid KHQR amount");
  return currency === "USD" ? (minorUnits / 100).toFixed(2) : String(minorUnits);
}

export function buildKhqr(input: KhqrInput): { qr: string; md5: string } {
  const mobile = input.mobileNumber ? localMobile(input.mobileNumber) : undefined;

  limit("account ID", input.accountId, 32);
  limit("merchant name", input.merchantName, 25);
  limit("merchant city", input.merchantCity, 15);
  limit("amount", input.amount, 13);
  limit("bill number", input.billNumber, 25);
  limit("mobile number", mobile, 25);
  limit("store label", input.storeLabel, 25);
  limit("terminal label", input.terminalLabel, 25);
  if (input.expiresAtMs <= input.createdAtMs) throw new Error("KHQR must expire after it is created");

  const additional =
    tlv("01", input.billNumber) +
    (mobile ? tlv("02", mobile) : "") +
    (input.storeLabel ? tlv("03", input.storeLabel) : "") +
    (input.terminalLabel ? tlv("07", input.terminalLabel) : "");

  let payload =
    tlv("00", "01") + // payload format
    tlv("01", "12") + // dynamic QR
    tlv("29", tlv("00", input.accountId)) +
    tlv("52", "5999") + // merchant category
    tlv("53", input.currency === "USD" ? "840" : "116") +
    tlv("54", input.amount) +
    tlv("58", "KH") +
    tlv("59", input.merchantName) +
    tlv("60", input.merchantCity) +
    tlv("62", additional) +
    tlv("99", tlv("00", String(input.createdAtMs)) + tlv("01", String(input.expiresAtMs))) +
    "6304";
  payload += crc16(payload);

  return { qr: payload, md5: createHash("md5").update(payload, "utf8").digest("hex") };
}
