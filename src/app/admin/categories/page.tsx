import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/admin/categories/actions";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { Field } from "@/components/form/field";
import { requireAdmin } from "@/lib/admin";
import {
  CATEGORY_NOTICES,
  listCategoriesWithCounts,
  type CategoryNotice,
} from "@/lib/admin-categories";

export const metadata: Metadata = {
  title: "Categories",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type SearchParams = Promise<{ notice?: string | string[] }>;

export default function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section aria-labelledby="admin-categories-title" className="page pt-8 pb-(--section-y) lg:pt-12">
      <header className="border-b pb-6 lg:pb-8">
        <p className="eyebrow text-muted">Admin</p>
        <h1 id="admin-categories-title" className="mt-2 text-title-l">
          Categories
        </h1>
      </header>

      {/* The session and search params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading categories" className="mt-6 h-96 bg-surface" />}>
        <Categories searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

type Placement = { showInMenu: boolean; showOnHome: boolean; activeCount: number };

// Where the store shows a category, which needs something in it on sale
function placementLabel({ showInMenu, showOnHome, activeCount }: Placement) {
  const places = [showInMenu && "in the menu", showOnHome && "on the homepage"].filter(Boolean).join(" and ");
  if (!places) return "Not in the store's menu or on its homepage";
  if (activeCount === 0) return `Not shown ${places} until something in it is on sale`;
  return `Shown ${places}`;
}

function productCountLabel(total: number, active: number) {
  if (total === 0) return "No products";
  return `${total} ${total === 1 ? "product" : "products"}, ${active} on sale`;
}

async function Categories({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/categories");

  const { notice: noticeKey } = await searchParams;
  const notice = typeof noticeKey === "string" ? CATEGORY_NOTICES[noticeKey as CategoryNotice] : undefined;
  const categories = await listCategoriesWithCounts();

  return (
    <>
      {notice && <AdminNotice notice={notice} className="mt-6" />}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <ul className="min-w-0 border-t">
          {categories.map((category) => {
            const hidden = (category.showInMenu || category.showOnHome) && category.activeCount === 0;
            return (
              <li key={category.id} className="border-b py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-body-s">{category.name}</h2>
                  <p className="text-caption text-muted">
                    {productCountLabel(category.productCount, category.activeCount)}
                  </p>
                </div>
                <Link
                  href={`/${category.slug}`}
                  prefetch={false}
                  className="mt-1 inline-block text-caption wrap-anywhere text-muted"
                >
                  /{category.slug}
                </Link>
                <p className={`mt-1 text-caption ${hidden ? "text-error" : "text-muted"}`}>
                  Position {category.position} · {placementLabel(category)}
                </p>

                {/* Remounted after saving, which closes it and shows what was stored */}
                <details key={category.updatedAt.getTime()} className="mt-3">
                  <summary className="nav-link link-quiet w-fit cursor-pointer">Edit</summary>
                  <div className="mt-4 flex max-w-md flex-col gap-6">
                    <AdminActionForm
                      action={updateCategoryAction}
                      hidden={{ categoryId: category.id }}
                      label="Save changes"
                      pendingLabel="Saving…"
                    >
                      <Field
                        id={`name-${category.id}`}
                        name="name"
                        label="Name"
                        required
                        maxLength={100}
                        defaultValue={category.name}
                      />
                      <Field
                        id={`position-${category.id}`}
                        name="position"
                        label="Position"
                        required
                        type="number"
                        min={0}
                        max={9999}
                        step={1}
                        defaultValue={category.position}
                        hint="Lower numbers come first in the menu and on the homepage. Equal numbers go by name."
                      />
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 block text-caption text-muted uppercase">Show in the store</legend>
                        <label className="flex items-center gap-2 text-body-s">
                          <input
                            type="checkbox"
                            name="showInMenu"
                            defaultChecked={category.showInMenu}
                            className="size-4 accent-foreground"
                          />
                          In the menu
                        </label>
                        <label className="flex items-center gap-2 text-body-s">
                          <input
                            type="checkbox"
                            name="showOnHome"
                            defaultChecked={category.showOnHome}
                            className="size-4 accent-foreground"
                          />
                          On the homepage, pictured by its newest product on sale
                        </label>
                        <p className="text-caption text-muted">
                          Only while something in it is on sale. New In, Women and Men are always in the menu, and Women and Men on the homepage.
                        </p>
                      </fieldset>
                    </AdminActionForm>

                    {category.productCount === 0 ? (
                      <details>
                        <summary className="nav-link link-quiet w-fit cursor-pointer">Delete this category</summary>
                        <p className="mt-4 mb-4 text-body-s text-muted">
                          This can&apos;t be undone.
                        </p>
                        <AdminActionForm
                          action={deleteCategoryAction}
                          hidden={{ categoryId: category.id }}
                          label="Delete permanently"
                          pendingLabel="Deleting…"
                        />
                      </details>
                    ) : (
                      <p className="text-caption text-muted">
                        To delete it, first move its products to another category, including drafts and archived ones.
                      </p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>

        <aside aria-labelledby="new-category-title" className="min-w-0">
          <h2 id="new-category-title" className="mb-4 border-b pb-3 text-title-s">
            New category
          </h2>
          {/* Remounted after a change, which clears what was typed */}
          <AdminActionForm
            key={categories.length}
            action={createCategoryAction}
            hidden={{}}
            label="Create category"
            pendingLabel="Creating…"
            primary
          >
            <Field id="name" label="Name" required maxLength={100} />
            <Field
              id="slug"
              label="Slug"
              maxLength={200}
              hint="The page's URL. Leave blank to use the name. It can't change later."
            />
          </AdminActionForm>
          <p className="mt-4 text-caption text-muted">
            A new category gets its own page and goes last. Edit it to put it in the store&apos;s menu or on its homepage.
          </p>
        </aside>
      </div>
    </>
  );
}
