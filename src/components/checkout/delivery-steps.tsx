"use client";

import { useState } from "react";
import { Step } from "@/components/checkout/step";
import { Field, SelectField } from "@/components/form/field";
import type { DeliveryMethod } from "@/lib/orders";
import { PROVINCES } from "@/lib/provinces";

const methods: { value: DeliveryMethod; title: string; description: string }[] = [
  {
    value: "delivery",
    title: "Delivery",
    description: "Complimentary, 2–4 business days",
  },
  {
    value: "pickup",
    title: "Pickup",
    description: "Collect in store. We'll email you when it's ready.",
  },
];

// Steps 02 and 03 share the delivery choice: pickup needs only a receiver name,
// so the address fields are hidden and disabled (kept, but not submitted)
export function DeliverySteps() {
  const [method, setMethod] = useState<DeliveryMethod>("delivery");
  const isPickup = method === "pickup";

  return (
    <>
      <Step number="02" title={isPickup ? "Receiver" : "Shipping Address"}>
        <Field
          id="receiverName"
          label="Receiver name"
          autoComplete="name"
          maxLength={100}
          required
          hint={isPickup ? "The person collecting the order." : undefined}
          className="sm:col-span-2"
        />
        <SelectField
          id="province"
          label="Province/City"
          placeholder="Select a province or city"
          options={PROVINCES}
          autoComplete="address-level1"
          required
          disabled={isPickup}
          className={isPickup ? "hidden" : "sm:col-span-2"}
        />
        <div className={isPickup ? "hidden" : "sm:col-span-2"}>
          <label htmlFor="addressDetail" className="mb-2 block text-caption text-muted uppercase">
            Address detail
          </label>
          <textarea
            id="addressDetail"
            name="addressDetail"
            rows={3}
            maxLength={300}
            autoComplete="street-address"
            required
            disabled={isPickup}
            aria-describedby="addressDetail-hint"
            className="input h-auto resize-none py-3"
          />
          <p id="addressDetail-hint" className="mt-2 text-caption text-muted">
            House or building number, street, commune and district.
          </p>
        </div>
      </Step>

      <Step number="03" title="Delivery">
        <div role="radiogroup" aria-label="Delivery method" className="flex flex-col gap-3 sm:col-span-2">
          {methods.map(({ value, title, description }) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-4 border border-line-strong p-5 transition-colors duration-400 hover:border-foreground has-checked:border-foreground"
            >
              <input
                type="radio"
                name="delivery"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                className="mt-1 size-4 accent-foreground"
              />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-body-s">{title}</span>
                <span className="text-caption text-muted">{description}</span>
              </span>
              <span className="text-body-s">Free</span>
            </label>
          ))}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="note" className="mb-2 block text-caption text-muted uppercase">
            Note <span className="normal-case">(optional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            maxLength={300}
            aria-describedby="note-hint"
            className="input h-auto resize-none py-3"
          />
          <p id="note-hint" className="mt-2 text-caption text-muted">
            Anything we should know, such as delivery instructions or a gift message.
          </p>
        </div>
      </Step>
    </>
  );
}
