// Server-side session access. Reads request headers, so call it inside
// <Suspense> (cacheComponents) or from a Server Action.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// A blocked user counts as signed out. Blocking already ends their sessions; this
// also covers a sign-in that was in progress at that moment.
export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.blockedAt ? null : session;
}
