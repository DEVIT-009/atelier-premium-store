"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_NETWORK_ERROR, getAuthErrorMessage } from "@/components/auth/auth-error";
import { PendingButton } from "@/components/form/pending-button";
import { Field } from "@/components/form/field";
import { signIn } from "@/lib/auth-client";
import { safeRedirect } from "@/lib/redirect";

type State = { error: string | null; email: string };

export function SignInForm() {
  const router = useRouter();
  const redirectParam = useSearchParams()?.get("redirectTo") ?? null;
  const redirectTo = safeRedirect(redirectParam);

  const [state, formAction] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      // Better Auth returns HTTP errors but throws when the fetch itself fails
      let result;
      try {
        result = await signIn.email({ email, password });
      } catch {
        return { error: AUTH_NETWORK_ERROR, email };
      }
      if (result.error) return { error: getAuthErrorMessage(result.error), email };

      router.replace(redirectTo);
      router.refresh();
      return { error: null, email };
    },
    { error: null, email: "" },
  );

  const signUpHref = redirectParam
    ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/sign-up";

  return (
    <>
      <form action={formAction} className="flex flex-col gap-5">
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
          autoComplete="current-password"
          required
        />

        {state.error && (
          <p role="alert" className="text-body-s text-error">
            {state.error}
          </p>
        )}

        <PendingButton className="btn btn-primary btn-lg btn-block mt-3">
          Sign in
        </PendingButton>
      </form>

      <p className="mt-10 border-t pt-8 text-body-s text-muted">
        New to Atelier?{" "}
        <Link href={signUpHref} className="link text-foreground">
          Create an account
        </Link>
      </p>
    </>
  );
}
