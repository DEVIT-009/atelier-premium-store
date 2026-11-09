import type { Metadata } from "next";
import Link from "next/link";
import {
  ClientServicesPage,
  PolicySection,
} from "@/components/client-services/client-services-page";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Complimentary express delivery across Cambodia in 2–4 business days, or collect in store.",
};

export default function ShippingPage() {
  return (
    <ClientServicesPage
      current="Shipping"
      title="Shipping"
      intro="Complimentary express delivery on every order, or collect your pieces in store."
    >
      <PolicySection title="Delivery">
        <p>
          Every order ships by complimentary express delivery and arrives in 2–4 business days. We
          deliver to Phnom Penh and all 24 provinces of Cambodia.
        </p>
      </PolicySection>

      <PolicySection title="Collect in Store">
        <p>
          Choose Pickup at checkout and name the person collecting the order. We&apos;ll contact you
          when your pieces are ready, and your order page will show Ready for pickup.
        </p>
      </PolicySection>

      <PolicySection title="Preparing Your Order">
        <p>
          We begin preparing your order once your KHQR payment is confirmed. Each piece is inspected
          and wrapped in our signature packaging, and you can add a handwritten note at checkout.
        </p>
      </PolicySection>

      <PolicySection title="Tracking Your Order">
        <p>
          Follow each stage of your order from your account. A tracking reference appears on your
          order page when one is available.
        </p>
        <Link href="/account/orders" prefetch={false} className="btn btn-secondary mt-2">
          Track your order
        </Link>
      </PolicySection>
    </ClientServicesPage>
  );
}
