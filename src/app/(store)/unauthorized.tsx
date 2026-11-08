import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

// Rendered by unauthorized(). Pages that want to send people back after signing
// in should keep using redirect("/sign-in?redirectTo=<path>") instead.
export default function StoreUnauthorized() {
  return (
    <StatusPage
      code={401}
      title="Sign in required"
      description="Please sign in to your account to view this page."
    >
      <Link href="/sign-in" className="btn btn-primary">
        Sign in
      </Link>
      <Link href="/" className="btn btn-secondary">
        Back to home
      </Link>
    </StatusPage>
  );
}
