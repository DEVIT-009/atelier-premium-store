import type { ReactNode } from "react";

// Numbered checkout form section; children lay out in a two-column grid from sm
export function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline gap-3 border-b pb-4">
        <span className="text-caption text-muted">{number}</span>
        <span className="text-title-m">{title}</span>
      </legend>
      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </fieldset>
  );
}
