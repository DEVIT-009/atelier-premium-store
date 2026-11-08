import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  adjustStockAction,
  deleteProductAction,
  setProductStatusAction,
  updateProductAction,
} from "@/app/admin/products/actions";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { ProductForm } from "@/components/admin/product-form";
import { ProductStatusBadge } from "@/components/admin/product-status";
import { Field, SelectField, TextareaField } from "@/components/form/field";
import { requireAdmin } from "@/lib/admin";
import {
  DEPARTMENTS,
  getProductForAdmin,
  IMAGE_HOSTS,
  listCategoriesForAdmin,
  PRODUCT_NOTICES,
  STOCK_REASONS,
  type ProductNotice,
  type ProductStatus,
} from "@/lib/admin-products";
import { formatDateTime } from "@/lib/format";
import { MAX_IMAGE_MB } from "@/lib/product-images";

export const metadata: Metadata = {
  title: "Product",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

// What each status can move to, as buttons
const STATUS_CHANGES: Record<ProductStatus, { to: ProductStatus; label: string; primary?: boolean }[]> = {
  draft: [
    { to: "active", label: "Publish", primary: true },
    { to: "archived", label: "Archive" },
  ],
  active: [
    { to: "archived", label: "Archive" },
    { to: "draft", label: "Move to draft" },
  ],
  archived: [
    { to: "active", label: "Restore to store", primary: true },
    { to: "draft", label: "Move to draft" },
  ],
};

const STATUS_NOTES: Record<ProductStatus, string> = {
  draft: "Off the store. Only staff can see it.",
  active: "On sale in the store.",
  archived: "Off the store and out of customers' bags. Its order history is kept, and QR codes already issued still work.",
};

export default function AdminProductPage({ params, searchParams }: PageProps) {
  return (
    <section className="page pt-8 pb-(--section-y) lg:pt-12">
      <Link href="/admin/products" prefetch={false} className="nav-link link-quiet">
        ← Products
      </Link>

      {/* The session and params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading product" className="mt-6 h-96 bg-surface" />}>
        <ProductDetail params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ProductDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  await requireAdmin(`/admin/products/${id}`);

  const [product, categories] = await Promise.all([getProductForAdmin(id), listCategoriesForAdmin()]);
  if (!product) notFound();

  const { notice: noticeKey } = await searchParams;
  const notice = typeof noticeKey === "string" ? PRODUCT_NOTICES[noticeKey as ProductNotice] : undefined;

  return (
    <>
      <header className="mt-4 border-b pb-6 lg:pb-8">
        <h1 className="text-title-l">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProductStatusBadge status={product.status} />
          <span className="text-caption wrap-anywhere text-muted">/products/{product.slug}</span>
        </div>
      </header>

      {notice && <AdminNotice notice={notice} className="mt-6" />}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
          {/* Remounted after a save, so the fields show what was stored */}
          <ProductForm
            key={product.updatedAt.getTime()}
            action={updateProductAction}
            categories={categories}
            departments={DEPARTMENTS}
            imageHosts={IMAGE_HOSTS}
            maxImageMb={MAX_IMAGE_MB}
            product={product}
          />
        </div>

        <aside aria-label="Product status" className="flex min-w-0 flex-col gap-10">
          <div className="media-frame aspect-portrait w-40">
            <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="160px" />
          </div>

          <Panel title="Status">
            <p className="mb-4 text-body-s text-muted">{STATUS_NOTES[product.status]}</p>
            <div className="flex flex-col gap-3">
              {STATUS_CHANGES[product.status].map((change) => (
                <AdminActionForm
                  key={change.to}
                  action={setProductStatusAction}
                  hidden={{ productId: product.id, from: product.status, to: change.to }}
                  label={change.label}
                  pendingLabel="Updating…"
                  primary={change.primary}
                />
              ))}
            </div>
            {product.status === "active" && (
              <Link href={`/products/${product.slug}`} prefetch={false} className="link mt-4 inline-block text-body-s">
                View in store
              </Link>
            )}
          </Panel>

          <Panel title="Stock">
            <dl className="mb-6 flex flex-col gap-2 text-body-s">
              <div className="flex justify-between gap-4">
                <dt>Available for sale</dt>
                <dd>{product.stock}</dd>
              </div>
              <div className="flex justify-between gap-4 text-muted">
                <dt>Held by unpaid QR codes</dt>
                <dd>{product.held}</dd>
              </div>
            </dl>
            {/* Remounted after a change, so a second click can't repeat the last one */}
            <AdminActionForm
              key={product.updatedAt.getTime()}
              action={adjustStockAction}
              hidden={{ productId: product.id }}
              label="Update stock"
              pendingLabel="Updating…"
            >
              <SelectField
                id="direction"
                label="Change"
                required
                placeholder="Add or remove"
                options={[
                  { value: "add", label: "Add" },
                  { value: "remove", label: "Remove" },
                ]}
              />
              <Field id="quantity" label="Quantity" required type="number" min={1} step={1} />
              <SelectField
                id="reason"
                label="Reason"
                required
                placeholder="Choose a reason"
                options={STOCK_REASONS}
              />
              <TextareaField id="note" label="Note" rows={2} maxLength={500} />
            </AdminActionForm>
          </Panel>

          {/* Never for a product on sale, or one with orders or stock history */}
          {product.status !== "active" && product.orderLines === 0 && product.movements.length === 0 && (
            <Panel title="Delete">
              <details>
                <summary className="nav-link link-quiet w-fit cursor-pointer">Delete this product</summary>
                <p className="mt-4 mb-4 text-body-s text-muted">
                  It has never been ordered, so it can be removed for good. This can&apos;t be undone.
                </p>
                <AdminActionForm
                  action={deleteProductAction}
                  hidden={{ productId: product.id }}
                  label="Delete permanently"
                  pendingLabel="Deleting…"
                />
              </details>
            </Panel>
          )}
        </aside>
      </div>

      <section aria-labelledby="stock-history-title" className="mt-12">
        <h2 id="stock-history-title" className="border-b pb-3 text-title-s">
          Stock history
        </h2>
        <p className="mt-3 text-body-s text-muted">
          Changes made by staff. Orders move stock too, so the numbers won&apos;t always follow on from each other.
          {product.hasOlderMovements && " Showing the latest 50."}
        </p>
        {product.movements.length === 0 ? (
          <p className="mt-6 text-body-s text-muted">No changes yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto border-t">
            <table className="w-full text-left text-body-s">
              <thead>
                <tr className="border-b text-caption text-muted uppercase">
                  <th scope="col" className="py-3 pr-4 font-normal">Change</th>
                  <th scope="col" className="py-3 pr-4 font-normal">Reason</th>
                  <th scope="col" className="py-3 text-right font-normal">Available after</th>
                </tr>
              </thead>
              <tbody>
                {product.movements.map((movement) => (
                  <tr key={movement.id} className="border-b align-top">
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {movement.delta > 0 ? `+${movement.delta}` : `−${-movement.delta}`}
                    </td>
                    <td className="py-4 pr-4">
                      {STOCK_REASONS.find((reason) => reason.value === movement.reason)?.label}
                      {movement.note && <p className="mt-1 wrap-anywhere text-muted">{movement.note}</p>}
                      <p className="mt-1 text-caption wrap-anywhere text-muted">
                        {movement.actor.email} · {formatDateTime(movement.createdAt)}
                      </p>
                    </td>
                    <td className="py-4 text-right">{movement.stockAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b pb-3 text-title-s">{title}</h2>
      {children}
    </section>
  );
}
