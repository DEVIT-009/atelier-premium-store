import { Head, Html, Main, NextScript } from "next/document";

// Only sets the language: the default document for these error pages has none
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
