import { formatPrice } from "@/lib/format";

// Subtotal, shipping, taxes and total; shared by the bag and checkout summaries
export function OrderTotals({
  subtotal,
  taxNote = "Calculated at checkout",
}: {
  subtotal: number;
  taxNote?: string;
}) {
  return (
    <dl className="flex flex-col gap-3 text-body-s">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Subtotal</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Shipping</dt>
        <dd>Complimentary</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Taxes</dt>
        <dd className="text-muted">{taxNote}</dd>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4 border-t pt-5 text-title-s">
        <dt>Total</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
    </dl>
  );
}
