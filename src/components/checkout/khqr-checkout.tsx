"use client";

import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  checkPayment,
  placeOrder,
  type CheckPaymentResult,
  type PlaceOrderState,
} from "@/app/checkout/actions";
import { CloseIcon } from "@/components/icons";
import { formatPriceExact } from "@/lib/format";

export const CHECKOUT_FORM_ID = "checkout-form";

type CheckoutContextValue = {
  state: PlaceOrderState;
  formAction: (formData: FormData) => void;
  pending: boolean;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function useCheckout() {
  const value = use(CheckoutContext);
  if (!value) throw new Error("useCheckout must be used inside <KhqrCheckout>");
  return value;
}

// Holds the place-order state for the form, both "Place order" buttons (one
// sits outside the form, in the summary) and the KHQR dialog.
export function KhqrCheckout({ children }: { children: ReactNode }) {
  const [state, formAction, pending] = useActionState(placeOrder, { status: "idle" });

  return (
    <CheckoutContext value={{ state, formAction, pending }}>
      {children}
      {state.status === "awaiting-payment" && <KhqrDialog key={state.payment.orderId} state={state} />}
    </CheckoutContext>
  );
}

export function CheckoutForm({ children, className }: { children: ReactNode; className: string }) {
  const { formAction } = useCheckout();

  return (
    <form
      id={CHECKOUT_FORM_ID}
      aria-label="Checkout details"
      className={className}
      // Not action={formAction}: React clears a form after its action runs,
      // and the details must survive closing the QR dialog
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {children}
    </form>
  );
}

export function PlaceOrderButton({ disabled }: { disabled: boolean }) {
  const { state, pending } = useCheckout();

  return (
    <>
      <button
        type="submit"
        form={CHECKOUT_FORM_ID}
        className="btn btn-primary btn-lg btn-block"
        disabled={disabled || pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Preparing KHQR…" : "Place order"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-center text-caption text-error uppercase">
          {state.message}
        </p>
      )}
    </>
  );
}

const RESULT_MESSAGES: Record<CheckPaymentResult["status"], string> = {
  pending:
    "We haven't received your payment yet. If you've just paid, wait a few seconds and check again.",
  expired: "This QR code has expired. Close this window and place your order again for a new code.",
  review:
    "We found a payment we couldn't match to this order. Please contact Client Services with your order reference.",
  unavailable: "We couldn't confirm your payment right now. Please try again in a moment.",
};

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return remaining;
}

function formatCountdown(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// KHQR payment dialog. Bakong is asked about the payment only when the
// customer clicks the button: there is no polling.
function KhqrDialog({ state }: { state: Extract<PlaceOrderState, { status: "awaiting-payment" }> }) {
  const { payment } = state;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<CheckPaymentResult | null>(null);
  const [checking, startChecking] = useTransition();
  const remaining = useCountdown(payment.expiresAt);
  const expired = remaining === 0;

  // Opens on every place-order result, including a reused QR for the same bag
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [state]);

  const close = () => dialogRef.current?.close();

  const check = () =>
    startChecking(async () => {
      // On PAID the action redirects to the thank-you page
      try {
        setResult(await checkPayment(payment.orderId));
      } catch {
        setResult({ status: "unavailable" }); // network or server error: nothing changed
      }
    });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="khqr-title"
      aria-describedby="khqr-instructions"
      onClose={() => setResult(null)}
      className="m-auto max-h-dvh w-full max-w-md overflow-y-auto bg-background text-foreground backdrop:bg-scrim max-sm:h-dvh max-sm:max-w-none"
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it
        if (event.target === dialogRef.current && !checking) close();
      }}
    >
      <div className="flex flex-col px-6 pt-4 pb-8 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-muted">Secure Payment</p>
          <button type="button" className="btn-icon -mr-2" aria-label="Close payment" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        <h2 id="khqr-title" className="mt-2 text-title-l">
          Pay with KHQR
        </h2>
        <p id="khqr-instructions" className="mt-2 text-body-s text-muted">
          Scan with any Cambodian banking app — ABA, ACLEDA, Wing, Bakong and more — then
          confirm below.
        </p>

        <figure className="mt-6 border">
          <div className="flex items-baseline justify-between gap-4 border-b px-5 py-4">
            <figcaption className="min-w-0">
              <span className="block truncate text-body-s">{payment.merchantName}</span>
              <span className="block text-caption text-muted uppercase">Order {payment.reference}</span>
            </figcaption>
            <span className="shrink-0 text-title-m">{formatPriceExact(payment.total)}</span>
          </div>
          <div className="relative bg-white p-4">
            {/* A data URL: next/image adds nothing here */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payment.qrImage}
              alt={`KHQR code to pay ${formatPriceExact(payment.total)} to ${payment.merchantName}`}
              width={280}
              height={280}
              className={`mx-auto aspect-square w-full max-w-70 [image-rendering:pixelated] ${expired ? "opacity-15" : ""}`}
            />
            {expired && (
              <p className="absolute inset-0 grid place-items-center text-label text-black uppercase">
                QR code expired
              </p>
            )}
          </div>
        </figure>

        <div className="mt-3 flex items-center justify-between gap-4 text-caption uppercase">
          <p className={expired ? "text-error" : "text-muted"} aria-live="off">
            {remaining === null ? " " : expired ? "Expired" : `Expires in ${formatCountdown(remaining)}`}
          </p>
          <a href={payment.qrImage} download={`atelier-${payment.reference}.png`} className="link text-foreground">
            Save QR image
          </a>
        </div>
        <p className="mt-2 text-caption text-muted sm:hidden">
          On this phone? Save the image, then open it from your banking app&apos;s scan screen.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-lg btn-block mt-8"
          onClick={check}
          disabled={checking}
          aria-busy={checking || undefined}
        >
          {checking ? "Checking payment…" : "I've paid — check payment"}
        </button>

        <div aria-live="polite" className="mt-4 min-h-10">
          {result && !checking && (
            <p
              role={result.status === "pending" ? "status" : "alert"}
              className={`text-center text-body-s ${result.status === "pending" ? "text-muted" : "text-error"}`}
            >
              {RESULT_MESSAGES[result.status]}
            </p>
          )}
        </div>

        <p className="mt-2 text-center text-caption text-muted uppercase">
          Pay the exact amount shown. Your pieces are held until the code expires.
        </p>
      </div>
    </dialog>
  );
}
