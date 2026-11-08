"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Marks the current section; .nav-link underlines aria-current="page".
// /admin matches exactly, so it isn't current on every admin page.
export function AdminNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = href === "/admin" ? pathname === href : pathname?.startsWith(href);

  return (
    <Link href={href} prefetch={false} className="nav-link link-quiet" aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
