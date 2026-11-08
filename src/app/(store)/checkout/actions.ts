"use server";

import { redirect } from "next/navigation";
import { readBagEntries, writeBagEntries } from "@/lib/bag";
import { BakongUnavailableError } from "@/lib/khqr/bakong";
import { getKhqrConfig } from "@/lib/khqr/config";
import { renderKhqrPng } from "@/lib/khqr/image";
import {
  checkOrderPayment,
  CheckoutError,
  createOrder,
  EarlierOrderPaidError,
  type CheckoutDetails,
} from "@/lib/orders";
import { isProvince } from "@/lib/provinces";
import { getSession } from "@/lib/session";

export type KhqrPayment = {
  orderId: string;
  reference: string;
  merchantName: string;
  total: number; // USD cents
  expiresAt: string; // ISO
  qrImage: string; // PNG data URL: shown in the dialog and saved for banking apps
};

export type PlaceOrderState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "awaiting-payment"; payment: KhqrPayment };

export type CheckPaymentResult = {
  status: "pending" | "expired" | "review" | "unavailable";
};

function text(formData: FormData, name: string, max: number, required: boolean) {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  if (required && !value) throw new CheckoutError("Please complete all required fields.");
  return value || null;
}

function readDetails(formData: FormData): CheckoutDetails {
  const email = text(formData, "email", 254, true)!;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutError("Please enter a valid email address.");
  }
  const contact = {
    email,
    phone: text(formData, "phone", 40, false),
    receiverName: text(formData, "receiverName", 100, true)!,
    note: text(formData, "note", 300, false),
  };

  const delivery = formData.get("delivery");
  if (delivery === "pickup") {
    return { ...contact, delivery, province: null, addressDetail: null };
  }
  if (delivery !== "delivery") throw new CheckoutError("Please choose delivery or pickup.");

  const province = text(formData, "province", 100, true)!;
  if (!isProvince(province)) throw new CheckoutError("Please choose a province or city.");
  return {
    ...contact,
    delivery,
    province,
    addressDetail: text(formData, "addressDetail", 300, true)!,
  };
}

// Creates (or reuses) a pending order and returns its KHQR for the dialog.
// The total always comes from the database, never from the form.
export async function placeOrder(
  _previous: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/checkout");

  try {
    const details = readDetails(formData);
    const order = await createOrder(session.user.id, await readBagEntries(), details);
    const qrImage = await renderKhqrPng(order.khqr);

    return {
      status: "awaiting-payment",
      payment: {
        orderId: order.orderId,
        reference: order.reference,
        merchantName: getKhqrConfig().merchantName,
        total: order.total,
        expiresAt: order.expiresAt,
        qrImage,
      },
    };
  } catch (error) {
    if (error instanceof CheckoutError) return { status: "error", message: error.message };
    if (error instanceof EarlierOrderPaidError) {
      // A different bag is a new purchase, so it stays for later
      if (error.sameBag) await writeBagEntries([]);
      redirect(`/checkout/thank-you?order=${error.orderId}`);
    }
    console.error("placeOrder failed", error);
    return { status: "error", message: "We couldn't start your payment. Please try again." };
  }
}

// Runs only when the customer clicks "I've paid": one Bakong lookup per click.
// Paid → the bag is cleared and the customer goes to the thank-you page.
export async function checkPayment(orderId: string): Promise<CheckPaymentResult> {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/checkout");

  let result;
  try {
    result = await checkOrderPayment(orderId, session.user.id);
  } catch (error) {
    if (error instanceof BakongUnavailableError) {
      console.error("Bakong check failed", error.message);
      return { status: "unavailable" };
    }
    throw error;
  }
  if (!result) return { status: "review" };

  if (result.status === "paid" || result.status === "paid_late") {
    await writeBagEntries([]);
    redirect(`/checkout/thank-you?order=${orderId}`);
  }
  return { status: result.status };
}
