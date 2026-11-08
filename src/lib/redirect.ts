// Only same-site paths: "/checkout" yes, "//evil.com" or "https://…" no.
// Browsers strip tabs and newlines and read "\" as "/", so "/\t/evil.com" and
// "/\evil.com" would leave the site: any control character or backslash is refused.
export function safeRedirect(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\x00-\x1f\x7f\\]/.test(value)) {
    return fallback;
  }
  return value;
}
