import Form from "next/form";
import Link from "next/link";

// Filter links and search box above an admin table; both live in the URL
export function ListControls<Filter extends string>({
  label,
  action,
  options,
  filter,
  query,
  searchLabel,
  placeholder,
  hrefFor,
}: {
  label: string;
  action: string;
  options: readonly { value: Filter; label: string }[];
  filter: Filter;
  query: string;
  searchLabel: string;
  placeholder: string;
  hrefFor: (value: Filter) => string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label={`Filter ${label}`} className="-mx-1 overflow-x-auto">
        <ul className="flex items-center gap-5 px-1 py-1">
          {options.map((option) => (
            <li key={option.value} className="shrink-0">
              <Link
                href={hrefFor(option.value)}
                prefetch={false}
                className="nav-link link-quiet"
                aria-current={option.value === filter ? "page" : undefined}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Form action={action} role="search" className="flex w-full gap-2 lg:max-w-sm">
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
        <label htmlFor={`${label}-search`} className="sr-only">
          {searchLabel}
        </label>
        <input
          id={`${label}-search`}
          name="q"
          type="search"
          defaultValue={query}
          placeholder={placeholder}
          className="input"
        />
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </Form>
    </div>
  );
}

// Newest and Older links under an admin table; renders nothing on a single page
export function ListPager({ newestHref, olderHref }: { newestHref?: string; olderHref?: string }) {
  if (!newestHref && !olderHref) return null;

  return (
    <nav aria-label="Pages" className="mt-6 flex justify-between gap-4">
      {newestHref ? (
        <Link href={newestHref} prefetch={false} className="btn btn-secondary btn-sm">
          Newest
        </Link>
      ) : (
        <span />
      )}
      {olderHref && (
        <Link href={olderHref} prefetch={false} className="btn btn-secondary btn-sm">
          Older
        </Link>
      )}
    </nav>
  );
}
