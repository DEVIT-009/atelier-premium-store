"use client";

import { ServerError } from "@/components/layout/server-error";
import { brandSans, brandSerif } from "./fonts";
import "./globals.css";

// Replaces the root layout when it fails, so it brings its own document, styles and fonts
export default function GlobalError(props: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandSerif.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex flex-1 flex-col justify-center">
          <ServerError {...props} />
        </main>
      </body>
    </html>
  );
}
