import Link from "next/link";

const columns = [
  {
    title: "Client Services",
    links: [
      { label: "Contact Us", href: "/client-services" },
      { label: "Shipping", href: "/client-services/shipping" },
      { label: "Returns", href: "/client-services/returns" },
      { label: "FAQs", href: "/client-services/faq" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "About Atelier", href: "/about" },
      { label: "Journal", href: "/journal" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Sale", href: "/legal/terms" },
      { label: "Accessibility", href: "/legal/accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="theme-inverse">
      <div className="page section">
        <div className="grid-layout gap-y-10">
          {columns.map((column) => (
            <div key={column.title} className="col-span-2 lg:col-span-3">
              <h2 className="eyebrow text-muted">{column.title}</h2>
              <ul className="mt-5 flex flex-col gap-3 text-body-s">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-quiet">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-4 lg:col-span-3">
            <h2 className="eyebrow text-muted">Country / Region</h2>
            <p className="mt-5 text-body-s">United States (USD $)</p>
          </div>
        </div>

        <p
          aria-hidden="true"
          // Sized so the word spans the content width; capped past the 1600px container
          className="mt-16 font-serif text-[min(28vw,28rem)] leading-[0.8] tracking-[0.04em] uppercase lg:mt-24"
        >
          Atelier
        </p>

        <div className="mt-8 flex flex-col gap-2 border-t pt-6 text-caption uppercase sm:flex-row sm:justify-between">
          <p>© 2026 Atelier Store</p>
          <p className="text-muted">Some images courtesy of Unsplash</p>
        </div>
      </div>
    </footer>
  );
}
