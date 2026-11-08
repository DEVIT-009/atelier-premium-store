"use client";

import { ServerError } from "@/components/layout/server-error";

// Sits inside the store layout, so failed pages keep the header and footer
export default function StoreError(props: {
  error: unknown;
  retry: () => void;
}) {
  return <ServerError {...props} />;
}
