import type { ReactNode } from "react";

// Shared layout for the 400, 401, 403, 404 and 500 pages. No hooks or data, so
// it works anywhere: error boundaries, the root layout's fallback, Pages Router.
export function StatusPage({
  code,
  title,
  description,
  children,
}: {
  code: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="page flex flex-col items-center py-16 text-center lg:py-24">
      <title>{`${title} | Atelier Store`}</title>
      <p className="eyebrow text-muted">Error {code}</p>
      <h1 className="mt-4 font-serif text-[3.5rem] leading-none lg:text-[6rem]">
        {title}
      </h1>
      <p className="mt-6 max-w-md text-lead">{description}</p>
      <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:flex-row">
        {children}
      </div>
    </div>
  );
}
