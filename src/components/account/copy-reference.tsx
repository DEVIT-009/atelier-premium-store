"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, CopyIcon } from "@/components/icons";

const RESET_MS = 2000;

const STATUS_TEXT = { copied: "Order reference copied", failed: "Couldn't copy the order reference" };

// The clipboard needs HTTPS and permission, so a copy can fail and has to say so
export function CopyReference({ reference, className = "" }: { reference: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let result: "copied" | "failed" = "copied";
    try {
      await navigator.clipboard.writeText(reference);
    } catch {
      result = "failed";
    }
    setStatus(result);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), RESET_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy order reference ${reference}`}
        title={status === "idle" ? "Copy order reference" : STATUS_TEXT[status]}
        className={`btn-icon shrink-0 ${className}`}
      >
        {status === "copied" ? (
          <CheckIcon className="text-success" />
        ) : status === "failed" ? (
          <CloseIcon width={16} height={16} className="text-error" />
        ) : (
          <CopyIcon />
        )}
      </button>
      <span role="status" className="sr-only">
        {status === "idle" ? "" : STATUS_TEXT[status]}
      </span>
    </>
  );
}
