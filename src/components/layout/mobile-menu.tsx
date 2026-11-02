"use client";

import Link from "next/link";
import { useRef } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

type NavItem = { label: string; href: string };

// Native <dialog> gives focus trapping, Escape to close and a backdrop for free.
export function MobileMenu({ items }: { items: readonly NavItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className="btn-icon -ml-2 lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={open}
      >
        <MenuIcon />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-md bg-background text-foreground backdrop:bg-scrim"
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes the menu
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="flex h-full flex-col px-(--gutter)">
          <div className="flex h-(--header-height) shrink-0 items-center">
            <button
              type="button"
              className="btn-icon -ml-2"
              aria-label="Close menu"
              onClick={close}
            >
              <CloseIcon />
            </button>
          </div>

          <nav aria-label="Main" className="mt-8">
            <ul className="flex flex-col gap-5">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link-quiet text-title-l"
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t py-8">
            <Link href="/account" className="nav-link" onClick={close}>
              My Account
            </Link>
            <Link href="/client-services" className="nav-link" onClick={close}>
              Client Services
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
