import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
if (!cloudinaryCloudName) throw new Error("CLOUDINARY_CLOUD_NAME is required");

// Static CSP (no nonces): nonces would force every page to render dynamically.
// Images go through /_next/image and next/font self-hosts, so 'self' covers both.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  cacheComponents: true,
  // Enables forbidden() and unauthorized(), which render the 403 and 401 pages
  experimental: {
    authInterrupts: true,
    // Room for a 5 MB image upload (MAX_IMAGE_MB) plus the rest of the product form
    serverActions: { bodySizeLimit: "6mb" },
  },
  // The KHQR icon is read from disk at runtime (src/lib/khqr/image.ts); make
  // sure serverless bundles include it, since public/ is served separately
  outputFileTracingIncludes: {
    "/checkout": ["./public/assets/bakong.png"],
  },
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Only this account's images
      { protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudinaryCloudName}/image/upload/**` },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
