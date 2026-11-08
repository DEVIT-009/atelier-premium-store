"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

// Submit button that disables itself while its form's action is running
export function PendingButton({
  disabled,
  ...props
}: Omit<ComponentProps<"button">, "type">) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    />
  );
}
