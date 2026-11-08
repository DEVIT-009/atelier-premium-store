"use server";

import { redirect, RedirectType } from "next/navigation";
import type { AdminActionState } from "@/components/admin/action-form";
import { requireAdmin } from "@/lib/admin";
import {
  blockUser,
  demoteAdmin,
  promoteToAdmin,
  isUserId,
  signOutEverywhere,
  unblockUser,
  UserActionError,
  UserChangedError,
  type UserNotice,
} from "@/lib/admin-users";

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

// Runs the change and shows its result on the user page. redirect() stays
// outside the try: it throws.
async function run(
  formData: FormData,
  { reasonRequired, notice }: { reasonRequired: boolean; notice: UserNotice },
  change: (id: string, reason: string | null) => Promise<void>,
): Promise<AdminActionState> {
  const id = formData.get("userId");
  if (!isUserId(id)) return { status: "error", message: "This account no longer exists." };
  const reason = text(formData, "reason", 300);
  if (reasonRequired && !reason) return { status: "error", message: "Enter a reason." };

  let outcome: UserNotice = notice;
  try {
    await change(id, reason);
  } catch (error) {
    if (error instanceof UserChangedError) {
      outcome = "changed";
    } else if (error instanceof UserActionError) {
      return { status: "error", message: error.message };
    } else {
      console.error("Admin user action failed", error);
      return { status: "error", message: "That didn't work. Nothing changed. Please try again." };
    }
  }
  redirect(`/admin/users/${id}?notice=${outcome}`, RedirectType.replace);
}

export async function signOutEverywhereAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  return run(formData, { reasonRequired: true, notice: "signed_out" }, (id, reason) =>
    signOutEverywhere(id, reason!),
  );
}

export async function blockUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  return run(formData, { reasonRequired: true, notice: "blocked" }, (id, reason) => blockUser(id, reason!));
}

export async function unblockUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  return run(formData, { reasonRequired: false, notice: "unblocked" }, unblockUser);
}

export async function promoteToAdminAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const confirmEmail = text(formData, "confirmEmail", 320);
  if (!confirmEmail) return { status: "error", message: "Type their email to confirm." };
  return run(formData, { reasonRequired: true, notice: "promoted" }, (id, reason) =>
    promoteToAdmin(id, reason!, confirmEmail),
  );
}

export async function demoteAdminAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  return run(formData, { reasonRequired: true, notice: "demoted" }, (id, reason) => demoteAdmin(id, reason!));
}
