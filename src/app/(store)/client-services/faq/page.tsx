import type { Metadata } from "next";
import Link from "next/link";
import { ClientServicesPage } from "@/components/client-services/client-services-page";
import { Disclosure } from "@/components/layout/disclosure";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers to common questions about paying with KHQR, delivery, tracking and returns.",
};

const groups = [
  {
    title: "Ordering & Payment",
    questions: [
      {
        question: "How can I pay?",
        answer:
          "We accept KHQR. Scan the code at checkout with any Cambodian banking app, including ABA, ACLEDA, Wing and Bakong.",
      },
      {
        question: "Which currency are your prices in?",
        answer: "All prices are in US dollars.",
      },
      {
        question: "Do I need an account to order?",
        answer: "Yes. Signing in at checkout keeps every order together in your account.",
      },
      {
        question: "How long is my QR code valid?",
        answer:
          "For a short time after you place your order. We hold your pieces until then, and your order page shows the exact time. If the code expires, your pieces are released and you can place the order again.",
      },
      {
        question: "I've paid, but my order still says Awaiting payment.",
        answer:
          "Select \"I've paid — check payment\" in the QR window. If you've closed it, return to your bag and place the order again: we look for your earlier payment first, so you won't pay twice.",
      },
      {
        question: "I paid after my QR code expired. What happens now?",
        answer:
          "Your order will show as Under review. Client Services will contact you to confirm your pieces or arrange a refund.",
      },
      {
        question: "Can I change or cancel my order?",
        answer: "Please contact Client Services as soon as you can, with your order reference.",
      },
    ],
  },
  {
    title: "Delivery & Tracking",
    questions: [
      {
        question: "How much is delivery, and how long does it take?",
        answer: "Express delivery is complimentary on every order and takes 2–4 business days.",
      },
      {
        question: "Where do you deliver?",
        answer: "We deliver to Phnom Penh and all 24 provinces of Cambodia.",
      },
      {
        question: "Can I collect my order in store?",
        answer:
          "Yes. Choose Pickup at checkout, and we'll contact you when your pieces are ready.",
      },
      {
        question: "How do I track my order?",
        answer:
          "Open Your Orders in your account to follow each stage. A tracking reference appears on the order page when one is available.",
      },
      {
        question: "Can I include a gift note?",
        answer:
          "Yes. Every order arrives in signature packaging, and you can add a handwritten note at checkout.",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    questions: [
      {
        question: "What is your returns policy?",
        answer: "Returns and exchanges are complimentary within 30 days of delivery.",
      },
      {
        question: "How do I start a return?",
        answer:
          "Contact Client Services with your order reference and an advisor will arrange the next steps.",
      },
      {
        question: "How will I receive my refund?",
        answer:
          "Refunds are sent by bank transfer. Your order page will show Refunded once yours has been sent.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <ClientServicesPage
      current="FAQs"
      title="Frequently Asked Questions"
      intro="Quick answers about paying with KHQR, delivery, tracking and returns."
    >
      <div className="flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="eyebrow text-muted">{group.title}</h2>
            <div className="mt-4 border-t">
              {group.questions.map((item) => (
                <Disclosure key={item.question} title={item.question} titleClassName="text-body-s lg:text-body">
                  <p>{item.answer}</p>
                </Disclosure>
              ))}
            </div>
          </section>
        ))}

        <div className="bg-surface p-6 lg:p-8">
          <h2 className="eyebrow">Still Need Help?</h2>
          <p className="mt-3 text-body-s text-muted">Our advisors are available seven days a week.</p>
          <Link href="/client-services" className="btn btn-primary mt-6">
            Contact us
          </Link>
        </div>
      </div>
    </ClientServicesPage>
  );
}
