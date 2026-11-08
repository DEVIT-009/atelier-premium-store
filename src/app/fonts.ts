import { Instrument_Serif, Inter_Tight } from "next/font/google";

// Neutral grotesque for everything; weights used by the type scale in globals.css
export const brandSans = Inter_Tight({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Wordmark and editorial headlines only (font-serif), never for UI text
export const brandSerif = Instrument_Serif({
  variable: "--font-brand-serif",
  subsets: ["latin"],
  weight: "400",
});
