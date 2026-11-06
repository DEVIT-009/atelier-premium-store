import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthShell } from "@/components/auth/auth-shell";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      id="sign-up-title"
      eyebrow="My Account"
      title="Create Account"
      description="Save your details for a faster checkout and follow every order."
    >
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      {/* Reads ?redirectTo, which is URL data: keep it inside Suspense */}
      <Suspense fallback={<AuthFormSkeleton fields={3} />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
