// Admin authorization. Call requireAdmin() first in every admin page component,
// Server Action and data function, before any try: a layout check protects
// nothing. It reads request headers, so never call it inside "use cache". Admin
// pages also need `export const instant = false`: without it, dev validation logs
// an error when this stops the render for a non-admin. The layout's export isn't enough.
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/session";

// One session query per render. Does nothing in Server Actions, so each re-checks.
const getRequestSession = cache(getSession);

export function isUuid(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
}

// Signed out: sign in, then come back to redirectTo. Signed in without the admin
// role: not found, so the area doesn't announce itself. Only exactly "admin" passes.
export async function requireAdmin(redirectTo = "/admin") {
  const session = await getRequestSession();
  if (!session) redirect(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  if (session.user.role !== "admin") notFound();
  return session;
}
