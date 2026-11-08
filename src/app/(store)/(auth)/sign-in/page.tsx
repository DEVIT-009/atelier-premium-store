import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthShell } from "@/components/auth/auth-shell";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <AuthShell
      id="sign-in-title"
      eyebrow="My Account"
      title="Sign In"
      description="Sign in to check out faster and keep track of your orders."
    >
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      {/* Reads ?redirectTo, which is URL data: keep it inside Suspense */}
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
