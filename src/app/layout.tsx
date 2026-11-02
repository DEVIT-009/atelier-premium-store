import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

// Neutral grotesque for everything; weights used by the type scale in globals.css
const brandSans = Inter_Tight({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Wordmark and editorial headlines only (font-serif), never for UI text
const brandSerif = Instrument_Serif({
  variable: "--font-brand-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: { default: "Atelier Store", template: "%s | Atelier Store" },
  description:
    "Ready-to-wear, bags, shoes and jewelry, designed to be kept for years.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandSerif.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
