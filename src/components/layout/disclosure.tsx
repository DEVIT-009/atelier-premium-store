import type { ReactNode } from "react";
import { PlusIcon } from "@/components/icons";

// Works without JavaScript: a native <details> styled as an accordion row
export function Disclosure({
  title,
  titleClassName = "eyebrow",
  defaultOpen = false,
  children,
}: {
  title: string;
  titleClassName?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
        <span className={titleClassName}>{title}</span>
        <PlusIcon className="shrink-0 transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-6 text-body-s text-muted">{children}</div>
    </details>
  );
}
