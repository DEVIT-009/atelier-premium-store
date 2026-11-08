import type { ReactNode } from "react";

// A titled block on an admin detail page
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b pb-3 text-title-s">{title}</h2>
      {children}
    </section>
  );
}

// Rows with no value are left out
export function Details({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 text-body-s sm:grid-cols-[10rem_minmax(0,1fr)]">
      {rows.flatMap(([label, value]) =>
        value
          ? [
              <dt key={label} className="text-caption text-muted uppercase sm:pt-0.5">
                {label}
              </dt>,
              <dd key={`${label}-value`} className="wrap-anywhere">
                {value}
              </dd>,
            ]
          : [],
      )}
    </dl>
  );
}
