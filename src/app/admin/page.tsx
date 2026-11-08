import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { getDashboard } from "@/lib/admin-dashboard";
import { formatPriceExact } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/products";

export const metadata: Metadata = {
  title: "Overview",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

export default function AdminOverviewPage() {
  return (
    <section aria-labelledby="admin-overview-title" className="page pt-8 pb-(--section-y) lg:pt-12">
      <header className="border-b pb-6 lg:pb-8">
        <p className="eyebrow text-muted">Admin</p>
        <h1 id="admin-overview-title" className="mt-2 text-title-l">
          Overview
        </h1>
      </header>

      {/* The session lives in a cookie: read it inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading overview" className="mt-6 h-96 bg-surface" />}>
        <Dashboard />
      </Suspense>
    </section>
  );
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

async function Dashboard() {
  const { user } = await requireAdmin();
  const data = await getDashboard();

  return (
    <>
      <p className="mt-6 text-body-s text-muted">Signed in as {user.email}</p>

      <Group title="Needs attention">
        <Tile
          href="/admin/orders?status=paid_late"
          label="Late payments"
          value={data.latePayments}
          urgent={data.latePayments > 0}
          caption={data.latePayments > 0 ? "Accept or refund each one" : "None waiting"}
        />
        <Tile
          href="/admin/orders?status=to_fulfil"
          label="To fulfil"
          value={data.toFulfil}
          caption={data.toFulfil > 0 ? "Paid, not yet delivered or collected" : "Nothing to send"}
        />
        <Tile
          href="/admin/orders?status=overdue"
          label="Overdue QRs"
          value={data.overdue}
          caption={data.overdue > 0 ? "Past expiry, stock still held" : "None"}
        />
        <Tile
          href="/admin/products?status=low_stock"
          label="Low stock"
          value={data.lowStock}
          urgent={data.soldOut > 0}
          caption={
            data.lowStock > 0
              ? `${plural(data.soldOut, "sold out", "sold out")}, the rest ${LOW_STOCK_THRESHOLD} or fewer`
              : `All on sale have more than ${LOW_STOCK_THRESHOLD}`
          }
        />
      </Group>

      <Group title="Sales" note="Paid orders, by when they were paid. Late payments count once accepted; refunds don't count.">
        <Tile
          href="/admin/orders?status=paid"
          label="Today"
          value={formatPriceExact(data.sales.today.cents)}
          caption={plural(data.sales.today.orders, "order")}
        />
        <Tile
          href="/admin/orders?status=paid"
          label="Last 7 days"
          value={formatPriceExact(data.sales.week.cents)}
          caption={plural(data.sales.week.orders, "order")}
        />
        <Tile
          href="/admin/orders?status=paid"
          label="Last 30 days"
          value={formatPriceExact(data.sales.month.cents)}
          caption={plural(data.sales.month.orders, "order")}
        />
        <Tile
          href="/admin/users?status=customers"
          label="Customers"
          value={data.customers}
          caption={`${data.newCustomers} new in the last 7 days`}
        />
      </Group>
    </>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="border-b pb-3 text-title-s">{title}</h2>
      {note && <p className="mt-3 text-caption text-muted">{note}</p>}
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</ul>
    </section>
  );
}

// The whole tile links to the list behind the number. Urgency shows as words
// and a border, never color alone.
function Tile({
  href,
  label,
  value,
  caption,
  urgent = false,
}: {
  href: string;
  label: string;
  value: number | string;
  caption: string;
  urgent?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        className={`flex h-full flex-col border p-5 transition-colors hover:bg-surface ${urgent ? "border-error" : ""}`}
      >
        <span className="flex items-center justify-between gap-2 text-caption text-muted uppercase">
          {label}
          {urgent && <span className="text-error">Needs action</span>}
        </span>
        <span className="mt-3 text-title-l wrap-anywhere">{value}</span>
        <span className="mt-2 text-caption text-muted">{caption}</span>
      </Link>
    </li>
  );
}
