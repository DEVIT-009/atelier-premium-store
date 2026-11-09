import { Field, SelectField, TextareaField } from "@/components/form/field";

const topics = ["Order or delivery", "Return or exchange", "Payment", "Product question", "Something else"];

// A static sample: the app sends no email, so nothing here can be submitted yet.
// Deliberately not a <form>, which would put what was typed in the URL on Enter.
export function ContactForm() {
  return (
    <div role="group" aria-label="Contact form" className="mt-2 grid w-full gap-6 sm:grid-cols-2">
      <Field id="contact-name" label="Name" autoComplete="name" maxLength={100} required />
      <Field id="contact-email" label="Email" type="email" autoComplete="email" maxLength={254} required />
      <Field
        id="contact-order"
        label="Order reference"
        maxLength={20}
        placeholder="AT7K2M9QXA"
        autoComplete="off"
      />
      <SelectField
        id="contact-topic"
        label="Topic"
        placeholder="Select a topic"
        options={topics}
        required
      />
      <TextareaField
        id="contact-message"
        label="Message"
        rows={5}
        maxLength={2000}
        required
        className="sm:col-span-2"
      />
      <div className="flex flex-col items-start gap-3 sm:col-span-2">
        <button type="button" className="btn btn-primary" disabled>
          Send message
        </button>
        <p className="text-caption text-muted">Sample form: messages can&apos;t be sent yet.</p>
      </div>
    </div>
  );
}
