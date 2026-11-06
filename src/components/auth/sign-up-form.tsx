"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthErrorMessage } from "@/components/auth/auth-error";
import { PendingButton } from "@/components/bag/pending-button";
import { Field } from "@/components/form/field";
import { signUp } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirect";

type State = { error: string | null; name: string; email: string };

// No email verification: Better Auth signs the new user in straight away
export function SignUpForm() {
  const router = useRouter();
  const redirectParam = useSearchParams().get("redirectTo");
  const redirectTo = safeRedirect(redirectParam);

  const [state, formAction] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      const { error } = await signUp.email({ name, email, password });
      if (error) return { error: getAuthErrorMessage(error), name, email };

      router.replace(redirectTo);
      router.refresh();
      return { error: null, name, email };
    },
    { error: null, name: "", email: "" },
  );

  const signInHref = redirectParam
    ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/sign-in";

  return (
    <>
      <form action={formAction} className="flex flex-col gap-5">
        <Field
          id="name"
          label="Full name"
          autoComplete="name"
          defaultValue={state.name}
          maxLength={100}
          required
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          hint="At least 8 characters."
          required
        />

        {state.error && (
          <p role="alert" className="text-body-s text-error">
            {state.error}
          </p>
        )}

        <PendingButton className="btn btn-primary btn-lg btn-block mt-3">
          Create account
        </PendingButton>
      </form>

      <p className="mt-10 border-t pt-8 text-body-s text-muted">
        Already have an account?{" "}
        <Link href={signInHref} className="link text-foreground">
          Sign in
        </Link>
      </p>
    </>
  );
}
