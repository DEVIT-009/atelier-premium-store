"use server";

import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import type { AdminActionState } from "@/components/admin/action-form";
import { isUuid, requireAdmin } from "@/lib/admin";
import {
  CategoryActionError,
  CategoryChangedError,
  createCategory,
  deleteCategory,
  RESERVED_CATEGORY_SLUGS,
  type CategoryNotice,
  updateCategory,
} from "@/lib/admin-categories";
import { slugFromText } from "@/lib/format";

const categoryName = z
  .string({ error: "Enter a name." })
  .trim()
  .min(1, "Enter a name.")
  .max(100, "Keep the name under 100 characters.");

const newCategoryFields = z.object({
  name: categoryName,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,200}$/, "Use only lowercase letters, numbers and hyphens in the slug."),
});

// Unticked checkboxes aren't sent at all
const checkbox = z.literal("on").optional().transform((value) => value === "on");

const categoryFields = z.object({
  name: categoryName,
  position: z.coerce
    .number({ error: "Enter a position as a whole number." })
    .int("Enter a position as a whole number.")
    .min(0, "Enter a position of 0 or more.")
    .max(9999, "Enter a position under 10,000."),
  showInMenu: checkbox,
  showOnHome: checkbox,
});

function goToCategories(notice: CategoryNotice): never {
  redirect(`/admin/categories?notice=${notice}`, RedirectType.replace);
}

function failed(error: unknown): AdminActionState {
  if (error instanceof CategoryActionError) return { status: "error", message: error.message };
  console.error("Admin category action failed", error);
  return { status: "error", message: "That didn't work. Nothing changed. Please try again." };
}

export async function createCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = newCategoryFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { name } = parsed.data;
  const slug = parsed.data.slug || slugFromText(name);
  if (!slug) {
    return { status: "error", message: "Enter a slug: this name has no letters or numbers to use." };
  }
  if (RESERVED_CATEGORY_SLUGS.has(slug)) {
    return { status: "error", message: `"${slug}" is already a page on the store. Choose another slug.` };
  }

  let created: boolean;
  try {
    created = await createCategory({ name, slug });
  } catch (error) {
    return failed(error);
  }
  if (!created) return { status: "error", message: `Another category already uses "${slug}".` };
  goToCategories("created");
}

// A slug in the request is ignored
export async function updateCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("categoryId");
  if (!isUuid(id)) return { status: "error", message: "That category no longer exists." };

  const parsed = categoryFields.safeParse({
    name: formData.get("name") ?? undefined,
    // A blank position would otherwise become 0
    position: formData.get("position") || undefined,
    showInMenu: formData.get("showInMenu") ?? undefined,
    showOnHome: formData.get("showOnHome") ?? undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await updateCategory(id, parsed.data);
  } catch (error) {
    if (error instanceof CategoryChangedError) goToCategories("changed");
    return failed(error);
  }
  goToCategories("saved");
}

export async function deleteCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("categoryId");
  if (!isUuid(id)) return { status: "error", message: "That category no longer exists." };

  try {
    await deleteCategory(id);
  } catch (error) {
    if (error instanceof CategoryChangedError) goToCategories("changed");
    return failed(error);
  }
  goToCategories("deleted");
}
