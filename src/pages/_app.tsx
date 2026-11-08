import type { AppProps } from "next/app";
import { brandSans, brandSerif } from "@/app/fonts";
import "@/app/globals.css";

// Only src/pages/_error.tsx uses this: every real page is in the App Router
export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      className={`${brandSans.variable} ${brandSerif.variable} flex min-h-screen flex-col justify-center font-sans`}
    >
      <Component {...pageProps} />
    </div>
  );
}
