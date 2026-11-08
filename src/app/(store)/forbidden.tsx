import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

// Rendered by forbidden()
export default function StoreForbidden() {
  return (
    <StatusPage
      code={403}
      title="Access denied"
      description="Your account doesn't have permission to view this page."
    >
      <Link href="/" className="btn btn-primary">
        Back to home
      </Link>
    </StatusPage>
  );
}
