"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import { Field, SelectField, TextareaField } from "@/components/form/field";

const IMAGE_SOURCES = [
  { value: "upload", label: "Upload a file" },
  { value: "url", label: "Use a link" },
] as const;

export type ProductFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

type Values = {
  id: string;
  name: string;
  description: string;
  details: string[];
  priceCents: number;
  categoryId: string;
  department: string;
  badge: string | null;
  imageUrl: string;
  imageAlt: string;
};

// Creates a product, or edits one when `product` is given. Stock, slug and status
// are chosen only on creation: after that they aren't part of this form.
export function ProductForm({
  action,
  categories,
  departments,
  imageHosts,
  maxImageMb,
  product,
}: {
  action: (previous: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: readonly { value: string; label: string }[];
  departments: readonly { value: string; label: string }[];
  imageHosts: readonly string[];
  maxImageMb: number;
  product?: Values;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  // Links are full URLs and uploads are paths on this site
  const hasLocalImage = product?.imageUrl.startsWith("/") ?? false;
  const [source, setSource] = useState<"upload" | "url">(product && !hasLocalImage ? "url" : "upload");
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Not released in an effect's cleanup: Next hides this page on navigation, which
  // runs cleanups, and Back shows the form again with its file still chosen
  const showPreview = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file && URL.createObjectURL(file));
  };
  const errorFor = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <form
      aria-label={product ? "Edit product" : "New product"}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2"
      noValidate
      // Not action={formAction}: React clears a form after its action runs, and
      // what staff typed must survive an error
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Anything far over the limit wouldn't reach the action to get an error back
        const file = formData.get("imageFile");
        if (file instanceof File && file.size > maxImageMb * 1024 * 1024) {
          setFileError(`Upload an image under ${maxImageMb} MB.`);
          return;
        }
        startTransition(() => formAction(formData));
      }}
    >
      {product && <input type="hidden" name="productId" value={product.id} />}

      <Field
        id="name"
        label="Name"
        required
        maxLength={200}
        defaultValue={product?.name}
        error={errorFor("name")}
        className="sm:col-span-2"
      />
      {!product && (
        <Field
          id="slug"
          label="Slug"
          maxLength={200}
          hint="The product's URL. Leave blank to use the name. It can't change later."
          error={errorFor("slug")}
          className="sm:col-span-2"
        />
      )}
      <TextareaField
        id="description"
        label="Description"
        required
        rows={4}
        maxLength={2000}
        defaultValue={product?.description}
        error={errorFor("description")}
        className="sm:col-span-2"
      />
      <TextareaField
        id="details"
        label="Details and care"
        rows={5}
        hint="One per line."
        defaultValue={product?.details.join("\n")}
        error={errorFor("details")}
        className="sm:col-span-2"
      />
      <Field
        id="priceCents"
        label="Price (USD)"
        required
        inputMode="decimal"
        hint="Orders already placed keep their price."
        defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
        error={errorFor("priceCents")}
      />
      <Field
        id="badge"
        label="Badge"
        maxLength={40}
        hint='Shown on the product, like "New".'
        defaultValue={product?.badge ?? undefined}
        error={errorFor("badge")}
      />
      <SelectField
        id="categoryId"
        label="Category"
        required
        placeholder="Choose a category"
        options={categories}
        defaultValue={product?.categoryId}
        error={errorFor("categoryId")}
      />
      <SelectField
        id="department"
        label="Department"
        required
        placeholder="Choose a department"
        options={departments}
        defaultValue={product?.department}
        error={errorFor("department")}
      />
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 block text-caption text-muted uppercase">Image</legend>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
          {IMAGE_SOURCES.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-body-s">
              <input
                type="radio"
                name="imageSource"
                value={value}
                checked={source === value}
                onChange={() => {
                  setSource(value);
                  setFileError(null);
                  showPreview(null); // the file input goes too, and its file with it
                }}
                className="size-4 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
        {/* Only the chosen one is rendered, so only it is sent */}
        {source === "upload" ? (
          <Field
            id="imageFile"
            label="Image file"
            required={!product}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            hint={
              `JPG, PNG or WebP, up to ${maxImageMb} MB.` +
              (product ? " Leave empty to keep the current image." : "")
            }
            onChange={(event) => {
              setFileError(null);
              showPreview(event.target.files?.[0] ?? null);
            }}
            error={fileError ?? errorFor("imageFile")}
          />
        ) : (
          <Field
            id="imageUrl"
            label="Image URL"
            required
            type="url"
            hint={`A JPG, PNG or WebP image from ${imageHosts.join(" or ")}. We check the link when you save.`}
            defaultValue={hasLocalImage ? undefined : product?.imageUrl}
            error={errorFor("imageUrl")}
          />
        )}
        {preview && (
          <div className="media-frame mt-4 aspect-portrait w-40">
            {/* A file that isn't a picture can't be shown; saving reports the problem */}
            <Image
              src={preview}
              alt="Preview of the selected image"
              fill
              sizes="160px"
              unoptimized
              onError={() => showPreview(null)}
            />
          </div>
        )}
      </fieldset>
      <Field
        id="imageAlt"
        label="Image description"
        required
        maxLength={200}
        hint="Read aloud by screen readers."
        defaultValue={product?.imageAlt}
        error={errorFor("imageAlt")}
        className="sm:col-span-2"
      />
      {!product && (
        <>
          <Field
            id="stock"
            label="Stock"
            required
            type="number"
            min={0}
            step={1}
            hint="Units available for sale."
            error={errorFor("stock")}
          />
          <SelectField
            id="status"
            label="Status"
            required
            placeholder="Choose a status"
            options={[
              { value: "draft", label: "Draft (off the store)" },
              { value: "active", label: "Active (on sale)" },
            ]}
            defaultValue="draft"
            error={errorFor("status")}
          />
        </>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className="btn btn-primary btn-block"
        >
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        {state.status === "error" && (
          <p role="alert" className="text-body-s text-error">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
