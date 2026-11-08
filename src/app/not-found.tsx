import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

// For not-found outside the store layout, such as a non-admin opening /admin
export default function RootNotFound() {
  return (
    <main className="flex flex-1 flex-col justify-center">
      <StatusPage
        code={404}
        title="Page not found"
        description="This page may have moved or no longer exists."
      >
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </StatusPage>
    </main>
  );
}
