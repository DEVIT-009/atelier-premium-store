import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Renders nothing; sends signed-in visitors away from sign in / sign up.
// Reads cookies, so render it inside <Suspense>.
export async function RedirectIfSignedIn() {
  const session = await getSession();
  if (session) redirect("/account");
  return null;
}
