"use client";

import { ServerError } from "@/components/layout/server-error";

// For failures outside the store boundary: admin pages and the store layout itself
export default function RootError(props: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center">
      <ServerError {...props} />
    </main>
  );
}
