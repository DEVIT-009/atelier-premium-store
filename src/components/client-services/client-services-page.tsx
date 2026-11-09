import type { ReactNode } from "react";
import Link from "next/link";
import { Services } from "@/components/home/services";
import { Breadcrumb } from "@/components/layout/breadcrumb";

const CLIENT_SERVICES_HREF = "/client-services";

const pages = [
  { label: "Contact Us", href: CLIENT_SERVICES_HREF },
  { label: "Shipping", href: `${CLIENT_SERVICES_HREF}/shipping` },
  { label: "Returns", href: `${CLIENT_SERVICES_HREF}/returns` },
  { label: "FAQs", href: `${CLIENT_SERVICES_HREF}/faq` },
] as const;

// The frame around every Client Services page: heading, links between the pages
// and the services strip. `current` comes from the page so all of them stay static.
export function ClientServicesPage({
  current,
  title,
  intro,
  children,
}: {
  current: (typeof pages)[number]["label"];
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const isLanding = current === "Contact Us";

  return (
    <>
      <article aria-labelledby="client-services-title" className="page pt-6 pb-(--section-y)">
        <Breadcrumb
          crumbs={
            isLanding
              ? [{ label: "Client Services" }]
              : [{ label: "Client Services", href: CLIENT_SERVICES_HREF }, { label: current }]
          }
        />

        <header className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
          <p className="eyebrow text-muted">Client Services</p>
          <h1 id="client-services-title" className="mt-2 text-title-xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lead text-muted">{intro}</p>
        </header>

        <div className="grid-layout gap-y-8 pt-6 lg:pt-12">
          <nav aria-label="Client Services" className="col-span-4 min-w-0 overflow-x-auto lg:col-span-3">
            <ul className="flex items-center gap-5 py-1 lg:flex-col lg:items-start lg:gap-4">
              {pages.map((page) => (
                <li key={page.href} className="shrink-0">
                  <Link
                    href={page.href}
                    className="nav-link link-quiet"
                    aria-current={page.label === current ? "page" : undefined}
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-4 min-w-0 lg:col-span-7 lg:col-start-5">{children}</div>
        </div>
      </article>

      <Services />
    </>
  );
}

// One titled block of a policy page, divided from the next by a hairline
export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b py-8 first:pt-0 last:border-b-0 last:pb-0 lg:py-10 lg:first:pt-0">
      <h2 className="text-title-m">{title}</h2>
      <div className="mt-4 flex flex-col items-start gap-3 text-body-s text-muted lg:text-body">
        {children}
      </div>
    </section>
  );
}
