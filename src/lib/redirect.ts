// Only same-site paths: "/checkout" yes, "//evil.com" or "https://…" no
export function safeRedirect(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
