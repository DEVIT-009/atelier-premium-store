import { Suspense } from "react";
import Link from "next/link";
import { BagIcon, SearchIcon, UserIcon } from "@/components/icons";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { getBag } from "@/lib/bag";
import { getCategoryHref, getStoreCategories } from "@/lib/products";
import { navigation } from "@/lib/sample-data";

export async function SiteHeader() {
  // Cached, so the menu stays part of the static shell
  const { menu } = await getStoreCategories();
  const items = [
    ...navigation,
    ...menu.map((category) => ({ label: category.name, href: getCategoryHref(category) })),
  ];

  return (
    <>
      <div className="theme-inverse">
        <p className="page flex h-8 items-center justify-center text-caption uppercase">
          Complimentary express shipping and returns
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="page grid h-(--header-height) grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <MobileMenu items={items} />
            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-6">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="nav-link link-quiet">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <Link
            href="/"
            className="font-serif text-[1.75rem] leading-none tracking-[0.18em] uppercase lg:text-[2.25rem]"
          >
            Atelier
          </Link>

          <div className="-mr-2 flex items-center justify-end gap-1">
            <Link href="/search" className="btn-icon" aria-label="Search">
              <SearchIcon />
            </Link>
            <Link
              href="/account"
              className="btn-icon hidden sm:inline-grid"
              aria-label="Account"
            >
              <UserIcon />
            </Link>
            {/* The bag is a cookie: read it inside Suspense so the shell stays static */}
            <Suspense fallback={<BagLink count={0} />}>
              <BagLinkWithCount />
            </Suspense>
          </div>
        </div>
      </header>
    </>
  );
}

// Same count as the bag page: purchasable pieces of products still in the catalogue
async function BagLinkWithCount() {
  const { itemCount } = await getBag();
  return <BagLink count={itemCount} />;
}

function BagLink({ count }: { count: number }) {
  return (
    <Link
      href="/bag"
      className="btn-icon relative"
      aria-label={count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
    >
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[0.625rem] leading-none font-medium text-white tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
