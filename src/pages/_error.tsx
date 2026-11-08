import type { NextPageContext } from "next";
import Head from "next/head";
import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

// Next rejects malformed requests (such as /%E0%A4%A) with a 400 before the App
// Router runs, so this Pages Router file is the only way to style that response.
export default function ErrorPage({ statusCode }: { statusCode: number }) {
  const badRequest = statusCode === 400;
  const title = badRequest ? "Bad request" : "Something went wrong";

  return (
    <main>
      <Head>
        <title>{`${title} | Atelier Store`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <StatusPage
        code={statusCode}
        title={title}
        description={
          badRequest
            ? "We couldn't understand that request. Check the link and try again."
            : "We couldn't load this page. Please try again in a moment."
        }
      >
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </StatusPage>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 500,
});
