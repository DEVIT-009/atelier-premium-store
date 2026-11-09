import type { Metadata } from "next";
import Link from "next/link";
import {
  ClientServicesPage,
  PolicySection,
} from "@/components/client-services/client-services-page";
import { ContactForm } from "@/components/client-services/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Reach an Atelier advisor for help with an order, delivery or return.",
};

// The store's real details: each row shows on the page once it has a value
const contact: { email: string | null; phone: string | null; store: string | null } = {
  email: null,
  phone: null,
  store: null,
};

const channels = [
  contact.email && { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
  contact.phone && {
    label: "Phone",
    value: contact.phone,
    href: `tel:${contact.phone.replace(/[^+\d]/g, "")}`,
  },
  contact.store && { label: "Store", value: contact.store },
].filter((channel) => !!channel);

const topics = [
  { label: "Shipping", href: "/client-services/shipping" },
  { label: "Returns", href: "/client-services/returns" },
  { label: "FAQs", href: "/client-services/faq" },
];

export default function ContactPage() {
  return (
    <ClientServicesPage
      current="Contact Us"
      title="Contact Us"
      intro="Our advisors are here to help with your order, delivery or return."
    >
      <PolicySection title="Speak With an Advisor">
        <p>Advisors are available seven days a week.</p>
        {channels.length > 0 ? (
          <dl className="mt-2 flex w-full flex-col border-t text-body-s">
            {channels.map((channel) => (
              <div key={channel.label} className="flex justify-between gap-6 border-b py-4">
                <dt className="shrink-0">{channel.label}</dt>
                <dd className="min-w-0 text-right break-words text-foreground">
                  {"href" in channel ? (
                    <a href={channel.href} className="link">
                      {channel.value}
                    </a>
                  ) : (
                    channel.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>Our contact details will be published here soon.</p>
        )}
      </PolicySection>

      <PolicySection title="Send Us a Message">
        <ContactForm />
      </PolicySection>

      <PolicySection title="About an Existing Order">
        <p>
          Please have your order reference ready. It begins with AT and appears on each order in
          your account.
        </p>
        <Link href="/account/orders" prefetch={false} className="btn btn-secondary mt-2">
          View your orders
        </Link>
      </PolicySection>

      <PolicySection title="Find an Answer">
        <ul className="flex flex-col gap-3">
          {topics.map((topic) => (
            <li key={topic.href}>
              <Link href={topic.href} className="nav-link link text-foreground">
                {topic.label}
              </Link>
            </li>
          ))}
        </ul>
      </PolicySection>
    </ClientServicesPage>
  );
}
