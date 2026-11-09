import type { Metadata } from "next";
import Link from "next/link";
import {
  ClientServicesPage,
  PolicySection,
} from "@/components/client-services/client-services-page";

export const metadata: Metadata = {
  title: "Returns",
  description: "Return or exchange your pieces free of charge within 30 days of delivery.",
};

const steps = [
  "Contact Client Services with your order reference and the pieces you'd like to return or exchange.",
  "An advisor will confirm your return and arrange the next steps with you.",
  "Once your return is complete, we'll send your exchange or refund.",
];

export default function ReturnsPage() {
  return (
    <ClientServicesPage
      current="Returns"
      title="Returns"
      intro="Return or exchange your pieces free of charge within 30 days of delivery."
    >
      <PolicySection title="Our Returns Promise">
        <p>Returns and exchanges are complimentary within 30 days of delivery.</p>
      </PolicySection>

      <PolicySection title="How to Return">
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="w-6 shrink-0 text-foreground">{`0${index + 1}`}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <Link href="/client-services" className="btn btn-secondary mt-2">
          Contact us
        </Link>
      </PolicySection>

      <PolicySection title="Refunds">
        <p>
          Refunds are sent by bank transfer. Once yours has been sent, your order page will show the
          order as Refunded, along with the amount.
        </p>
      </PolicySection>
    </ClientServicesPage>
  );
}
