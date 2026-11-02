import Link from "next/link";
import { BagIcon, SearchIcon, UserIcon } from "@/components/icons";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { navigation } from "@/lib/sample-data";

export function SiteHeader() {
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
            <MobileMenu items={navigation} />
            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-6">
                {navigation.map((item) => (
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
            <Link href="/bag" className="btn-icon" aria-label="Shopping bag">
              <BagIcon />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
