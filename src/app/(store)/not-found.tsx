import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

// Sits inside the store layout, so missing pages keep the header and footer
export default function StoreNotFound() {
  return (
    <StatusPage
      code={404}
      title="Page not found"
      description="This page may have moved or no longer exists."
    >
      <Link href="/new-in" className="btn btn-primary">
        Shop new in
      </Link>
      <Link href="/" className="btn btn-secondary">
        Back to home
      </Link>
    </StatusPage>
  );
}
