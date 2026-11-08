"use server";

import { redirect, RedirectType } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  acceptLatePayment,
  cancelPendingOrder,
  OrderActionError,
  OrderChangedError,
  recheckOrderPayment,
  recordRefund,
  updateFulfilment,
  type FulfilmentStatus,
  type OrderNotice,
} from "@/lib/admin-orders";
import type { AdminActionState } from "@/components/admin/action-form";
import { formatPriceExact, parseDollars } from "@/lib/format";
import { BakongUnavailableError } from "@/lib/khqr/bakong";
import type { PaymentCheck } from "@/lib/orders";

// A form shows only what leaves it on the page: anything that changes the order
// goes to a notice on the order page instead
type Outcome = AdminActionState | { notice: OrderNotice };

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

// Runs the change and shows its result. redirect() stays outside the try: it throws.
async function run(orderId: string, change: () => Promise<Outcome>): Promise<AdminActionState> {
  let outcome: Outcome;
  try {
    outcome = await change();
  } catch (error) {
    if (error instanceof OrderChangedError) {
      outcome = { notice: "changed" };
    } else if (error instanceof OrderActionError) {
      return { status: "error", message: error.message };
    } else if (error instanceof BakongUnavailableError) {
      console.error("Bakong check failed", error.message);
      return {
        status: "error",
        message: "Bakong is unavailable, so the payment is unknown. Nothing changed. Try again in a moment.",
      };
    } else {
      console.error("Admin order action failed", error);
      return { status: "error", message: "That didn't work. Nothing changed. Please try again." };
    }
  }
  if ("notice" in outcome) {
    redirect(`/admin/orders/${orderId}?notice=${outcome.notice}`, RedirectType.replace);
  }
  return outcome;
}

// A payment Bakong can't match stays with the form, which isn't removed by it
function describeMismatch(check: Extract<PaymentCheck, { status: "review" }>): AdminActionState {
  const { expected, received } = check.mismatch ?? {};
  return {
    status: "error",
    message: "Bakong has a payment that doesn't match this order, so nothing changed. Check it in the bank.",
    details:
      expected && received
        ? [
            `Account: expected ${expected.account}, received ${received.account ?? "unknown"}`,
            `Currency: expected ${expected.currency}, received ${received.currency ?? "unknown"}`,
            `Amount: expected ${formatPriceExact(expected.cents)}, received ${formatPriceExact(received.cents)}`,
          ]
        : undefined,
  };
}

export async function recheckPaymentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId"));
  return run(orderId, async () => {
    const { before, result } = await recheckOrderPayment(orderId);
    switch (result.status) {
      case "paid":
        return { notice: "paid" };
      case "paid_late":
        return { notice: "paid_late" };
      case "review":
        return describeMismatch(result);
      default:
        return before === "pending" && result.status === "expired"
          ? { notice: "expired" }
          : { status: "notice", message: "Bakong has no payment for this QR." };
    }
  });
}

export async function updateFulfilmentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId"));
  return run(orderId, async () => {
    await updateFulfilment(
      orderId,
      String(formData.get("from")) as FulfilmentStatus,
      String(formData.get("to")) as FulfilmentStatus,
      text(formData, "trackingReference", 100),
    );
    return { notice: "fulfilment" };
  });
}

export async function acceptLatePaymentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId"));
  return run(orderId, async () => {
    await acceptLatePayment(orderId, text(formData, "reason", 300));
    return { notice: "accepted" };
  });
}

export async function cancelOrderAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const orderId = String(formData.get("orderId"));
  const reason = text(formData, "reason", 300);
  if (!reason) return { status: "error", message: "Please give a reason." };

  return run(orderId, async () => {
    const check = await cancelPendingOrder(orderId, reason);
    if (!check) return { notice: "cancelled" };
    switch (check.status) {
      case "paid":
        return { notice: "cancel_paid" };
      case "paid_late":
        return { notice: "paid_late" };
      case "review":
        return describeMismatch(check);
      default:
        return { notice: "expired" };
    }
  });
}

export async function recordRefundAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const reference = text(formData, "reference", 100);
  const reason = text(formData, "reason", 300);
  const amountCents = parseDollars(text(formData, "amount", 12) ?? "");
  if (!reference || !reason) {
    return { status: "error", message: "Please give the bank reference and a reason." };
  }
  if (!amountCents) return { status: "error", message: "Please enter the amount refunded, like 145.50." };

  const orderId = String(formData.get("orderId"));
  return run(orderId, async () => {
    await recordRefund(orderId, {
      reference,
      amountCents,
      reason,
      restock: formData.get("restock") === "on",
    });
    return { notice: "refunded" };
  });
}
