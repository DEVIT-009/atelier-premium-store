"use server";

import { randomUUID } from "node:crypto";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import type { AdminActionState } from "@/components/admin/action-form";
import type { ProductFormState } from "@/components/admin/product-form";
import { isUuid, requireAdmin } from "@/lib/admin";
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getProductImageUrl,
  IMAGE_HOSTS,
  ProductActionError,
  ProductChangedError,
  setProductStatus,
  STOCK_REASONS,
  updateProduct,
  type ProductStatus,
} from "@/lib/admin-products";
import { parseDollars, slugFromText } from "@/lib/format";
import {
  ImageRejectedError,
  isLocalImage,
  prepareUpload,
  removeProductImages,
  saveProductImage,
  softDeleteProductImage,
  verifyImageUrl,
} from "@/lib/product-images";

type FieldErrors = Record<string, string[] | undefined>;

function requiredText(message: string, max: number) {
  return z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(max, `Keep this under ${max} characters.`);
}

function isAllowedImageUrl(value: string) {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return protocol === "https:" && IMAGE_HOSTS.includes(hostname);
}

const productFields = z.object({
  name: requiredText("Enter a name.", 200),
  description: requiredText("Enter a description.", 2000),
  // One per line. Duplicates are removed because the store keys the list on the text.
  details: z
    .string()
    .max(5000, "Keep the details shorter.")
    .transform((value) => [...new Set(value.split("\n").map((line) => line.trim()).filter(Boolean))])
    .refine((lines) => lines.length <= 20, "Use at most 20 lines."),
  priceCents: z.string().transform((value, context) => {
    const cents = parseDollars(value.trim());
    if (!cents) {
      context.addIssue({ code: "custom", message: "Enter a price above zero, like 145.50." });
      return z.NEVER;
    }
    return cents;
  }),
  categoryId: z.uuid({ error: "Choose a category." }),
  department: z.enum(["women", "men", "unisex"], { error: "Choose a department." }),
  badge: z
    .string()
    .trim()
    .max(40, "Keep the badge under 40 characters.")
    .transform((value) => value || null),
  imageAlt: requiredText("Describe the image.", 200),
});

const imageUrlField = z
  .string({ error: "Enter an image URL." })
  .trim()
  .refine(isAllowedImageUrl, `Use an https image from ${IMAGE_HOSTS.join(" or ")}.`);

type ImageChoice = { url: string } | { file: File } | { keep: true };

// What the form asks for, before anything slow. Only an edit can leave the upload
// empty, which keeps the current image.
function readImageChoice(formData: FormData, editing: boolean): ImageChoice | { error: FieldErrors } {
  if (formData.get("imageSource") === "upload") {
    const file = formData.get("imageFile");
    if (file instanceof File && file.size > 0) return { file };
    return editing ? { keep: true } : { error: { imageFile: ["Choose an image to upload."] } };
  }
  const url = imageUrlField.safeParse(formData.get("imageUrl") ?? undefined);
  return url.success ? { url: url.data } : { error: { imageUrl: [url.error.issues[0].message] } };
}

// Runs the slow checks on what was chosen. A failure is a message for its field.
async function checkImage(choice: ImageChoice, currentUrl?: string) {
  try {
    if ("file" in choice) return { upload: await prepareUpload(choice.file) };
    // Saving an edit shouldn't depend on another site for a link it already has
    if ("url" in choice && choice.url !== currentUrl) await verifyImageUrl(choice.url);
    return {};
  } catch (error) {
    if (!(error instanceof ImageRejectedError)) throw error;
    return { error: { ["file" in choice ? "imageFile" : "imageUrl"]: [error.message] } };
  }
}

const newProductFields = productFields.extend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,200}$/, "Use only lowercase letters, numbers and hyphens."),
  // Not z.coerce.number(), which would turn a blank field into 0
  stock: z
    .string({ error: "Enter a whole number, 0 or more." })
    .trim()
    .regex(/^\d{1,6}$/, "Enter a whole number, 0 or more.")
    .transform(Number),
  status: z.enum(["draft", "active"], { error: "Choose a status." }),
});

const stockFields = z.object({
  direction: z.enum(["add", "remove"], { error: "Choose add or remove." }),
  quantity: z
    .string({ error: "Enter a whole number, 1 or more." })
    .trim()
    .regex(/^[1-9]\d{0,5}$/, "Enter a whole number, 1 or more.")
    .transform(Number),
  reason: z.enum(
    STOCK_REASONS.map((reason) => reason.value),
    { error: "Choose a reason." },
  ),
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters.")
    .transform((value) => value || null),
});

function invalid(fieldErrors: FieldErrors): ProductFormState {
  return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
}

// The form's errors in one list, so staff see everything to fix at once
function formErrors(error: z.ZodError | undefined, image: ImageChoice | { error: FieldErrors }): FieldErrors | null {
  const imageErrors = "error" in image ? image.error : undefined;
  if (!error && !imageErrors) return null;
  return { ...(error && z.flattenError(error).fieldErrors), ...imageErrors };
}

function failed(error: unknown): ProductFormState {
  if (error instanceof ProductActionError) return { status: "error", message: error.message };
  console.error("Admin product action failed", error);
  return { status: "error", message: "That didn't work. Nothing changed. Please try again." };
}

function goToProduct(id: string, notice: string): never {
  redirect(`/admin/products/${id}?notice=${notice}`, RedirectType.replace);
}

export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = newProductFields.safeParse(Object.fromEntries(formData));
  const choice = readImageChoice(formData, false);
  const errors = formErrors(parsed.error, choice);
  if (errors || !parsed.success || "error" in choice) return invalid(errors ?? {});

  const slug = parsed.data.slug || slugFromText(parsed.data.name);
  if (!slug) return invalid({ slug: ["Enter a slug: this name has no letters or numbers to use."] });

  const id = randomUUID();
  let created: string | null;
  try {
    const checked = await checkImage(choice);
    if (checked.error) return invalid(checked.error);

    const imageUrl = checked.upload ? await saveProductImage(id, checked.upload) : (choice as { url: string }).url;
    created = await createProduct({ ...parsed.data, id, slug, imageUrl }).catch(async (error: unknown) => {
      await removeProductImages(id);
      throw error;
    });
    if (!created) await removeProductImages(id);
  } catch (error) {
    return failed(error);
  }
  if (!created) return invalid({ slug: [`Another product already uses "${slug}".`] });
  goToProduct(id, "created");
}

// Reads only the editable fields: stock and slug in the request are ignored
export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const id = formData.get("productId");
  if (!isUuid(id)) return { status: "error", message: "This product no longer exists." };

  const parsed = productFields.safeParse(Object.fromEntries(formData));
  const choice = readImageChoice(formData, true);
  const errors = formErrors(parsed.error, choice);
  if (errors || !parsed.success || "error" in choice) return invalid(errors ?? {});

  try {
    const currentUrl = await getProductImageUrl(id);
    if (currentUrl === undefined) throw new ProductChangedError();

    const checked = await checkImage(choice, currentUrl);
    if (checked.error) return invalid(checked.error);

    const imageUrl = checked.upload
      ? await saveProductImage(id, checked.upload)
      : "url" in choice
        ? choice.url
        : currentUrl;
    await updateProduct(id, { ...parsed.data, imageUrl });

    // The product no longer points at these, so a problem here isn't a failed save
    if (checked.upload || (isLocalImage(currentUrl) && !isLocalImage(imageUrl))) {
      await (checked.upload
        ? removeProductImages(id, checked.upload.extension)
        : softDeleteProductImage(id)
      ).catch((error: unknown) => console.error("Could not clean up a replaced image", { id, error }));
    }
  } catch (error) {
    if (error instanceof ProductChangedError) {
      return { status: "error", message: "This product no longer exists." };
    }
    return failed(error);
  }
  goToProduct(id, "saved");
}

const STATUSES: readonly string[] = ["draft", "active", "archived"] satisfies ProductStatus[];

export async function setProductStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("productId");
  const from = String(formData.get("from"));
  const to = String(formData.get("to"));
  if (!isUuid(id) || !STATUSES.includes(from) || !STATUSES.includes(to) || from === to) {
    return { status: "error", message: "That change isn't available." };
  }

  let notice = to;
  try {
    await setProductStatus(id, from as ProductStatus, to as ProductStatus);
  } catch (error) {
    if (error instanceof ProductChangedError) notice = "changed";
    else return failed(error) as AdminActionState;
  }
  goToProduct(id, notice);
}

export async function adjustStockAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("productId");
  if (!isUuid(id)) return { status: "error", message: "This product no longer exists." };

  const parsed = stockFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { direction, quantity, reason, note } = parsed.data;
  const expected = STOCK_REASONS.find((option) => option.value === reason)?.direction;
  if (expected && expected !== direction) {
    return { status: "error", message: `That reason can only ${expected} stock.` };
  }
  if (reason === "other" && !note) {
    return { status: "error", message: "Add a note explaining this change." };
  }

  try {
    await adjustStock(id, direction === "add" ? quantity : -quantity, reason, note);
  } catch (error) {
    if (error instanceof ProductChangedError) {
      return { status: "error", message: "This product no longer exists." };
    }
    return failed(error) as AdminActionState;
  }
  goToProduct(id, "stock");
}

export async function deleteProductAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("productId");
  if (!isUuid(id)) return { status: "error", message: "This product no longer exists." };

  try {
    await deleteProduct(id);
  } catch (error) {
    if (error instanceof ProductChangedError) goToProduct(id, "changed");
    return failed(error) as AdminActionState;
  }
  redirect("/admin/products?notice=deleted", RedirectType.replace);
}
