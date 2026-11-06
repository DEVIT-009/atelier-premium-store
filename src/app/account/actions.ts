"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

// nextCookies() in src/lib/auth.ts lets signOut clear the session cookie here
export async function signOutAction() {
  if (await getSession()) {
    await auth.api.signOut({ headers: await headers() });
  }
  redirect("/");
}
