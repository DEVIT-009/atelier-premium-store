"use client";

import { startTransition, useActionState, type ReactNode } from "react";

export type AdminActionState =
  | { status: "idle" }
  | { status: "notice" | "error"; message: string; details?: string[] };

const TONES = {
  notice: "text-muted",
  error: "text-error",
};

// A staff action, showing any result that leaves the form on the page
export function AdminActionForm({
  action,
  hidden,
  label,
  pendingLabel,
  primary = false,
  children,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  hidden: Record<string, string>;
  label: string;
  pendingLabel: string;
  primary?: boolean;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });

  return (
    <form
      className="flex flex-col gap-4"
      // Not action={formAction}: React clears a form after its action runs, and
      // what staff typed must survive an error
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={`btn btn-sm btn-block ${primary ? "btn-primary" : "btn-secondary"}`}
      >
        {pending ? pendingLabel : label}
      </button>
      {state.status !== "idle" && (
        <div role={state.status === "error" ? "alert" : "status"} className={`text-body-s ${TONES[state.status]}`}>
          <p>{state.message}</p>
          {state.details && (
            <ul className="mt-2 flex flex-col gap-1">
              {state.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
