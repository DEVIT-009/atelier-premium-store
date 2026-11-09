import Link from "next/link";

// The last crumb is the current page. Links skip prefetch because account pages
// read the session and the customer's data from the database.
export function Breadcrumb({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
        <li>
          <Link href="/" className="link-quiet">
            Home
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {crumb.href ? (
              <Link href={crumb.href} prefetch={false} className="link-quiet">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
