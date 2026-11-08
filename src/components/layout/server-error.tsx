"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "@/components/layout/status-page";

// The 500 page, rendered by every error boundary. Shows no error details:
// production hides them from the client anyway, and the digest is in server logs.
export function ServerError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code={500}
      title="Something went wrong"
      description="We couldn't load this page. Please try again in a moment."
    >
      <button type="button" onClick={() => retry()} className="btn btn-primary">
        Try again
      </button>
      <Link href="/" className="btn btn-secondary">
        Back to home
      </Link>
    </StatusPage>
  );
}
