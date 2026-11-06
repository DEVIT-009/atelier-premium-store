// Server-side session access. Reads request headers, so call it inside
// <Suspense> (cacheComponents) or from a Server Action.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
