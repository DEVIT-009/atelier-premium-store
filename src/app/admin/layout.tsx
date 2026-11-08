import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { AdminNavLink } from "@/components/admin/admin-nav-link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

const navigation = [
  { label: "Overview", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Users", href: "/admin/users" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    // The session lives in a cookie: read it inside Suspense
    <Suspense fallback={<div aria-busy="true" aria-label="Loading admin" className="flex-1" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

// Keeps the admin navigation away from non-admins. This isn't what protects
// admin data: layouts don't re-render on navigation, so pages and actions check too.
async function AdminShell({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="page flex h-(--header-height) items-center justify-between gap-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link
              href="/admin"
              prefetch={false}
              className="font-serif text-[1.75rem] leading-none tracking-[0.18em] uppercase"
            >
              Atelier
            </Link>
            <span className="eyebrow text-muted">Admin</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/" className="nav-link link-quiet hidden sm:inline">
              View store
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav aria-label="Admin" className="page overflow-x-auto border-t">
          <ul className="flex h-10 items-center gap-6">
            {navigation.map((item) => (
              <li key={item.href} className="shrink-0">
                <AdminNavLink href={item.href}>{item.label}</AdminNavLink>
              </li>
            ))}
            <li className="shrink-0 sm:hidden">
              <Link href="/" className="nav-link link-quiet">
                View store
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
