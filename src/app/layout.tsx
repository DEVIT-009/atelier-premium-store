import type { Metadata } from "next";
import { brandSans, brandSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Atelier Store", template: "%s | Atelier Store" },
  description:
    "Ready-to-wear, bags, shoes and jewelry, designed to be kept for years.",
};

// Store and admin each add their own header in (store)/layout and admin/layout
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandSerif.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
