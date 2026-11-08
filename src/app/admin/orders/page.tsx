import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListControls, ListPager } from "@/components/admin/list-controls";
import { FulfilmentBadge, OrderStatusBadge } from "@/components/admin/order-status";
import { isUuid, requireAdmin } from "@/lib/admin";
import {
  listOrdersForAdmin,
  ORDER_FILTERS,
  type OrderFilter,
} from "@/lib/admin-orders";
import { formatDateTime, formatPriceExact } from "@/lib/format";

export const metadata: Metadata = {
  title: "Orders",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

// Admin links never prefetch: every link would read the session and its order
// from the database just for being on screen, and each table row is a link.

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function ordersHref(filter: OrderFilter, query: string, after?: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (query) params.set("q", query);
  if (after) params.set("after", after);
  const search = params.toString();
  return search ? `/admin/orders?${search}` : "/admin/orders";
}

export default function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section aria-labelledby="admin-orders-title" className="page pt-8 pb-(--section-y) lg:pt-12">
      <header className="border-b pb-6 lg:pb-8">
        <p className="eyebrow text-muted">Admin</p>
        <h1 id="admin-orders-title" className="mt-2 text-title-l">
          Orders
        </h1>
      </header>

      {/* The session and search params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading orders" className="mt-6 h-96 bg-surface" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Orders({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/orders");

  const params = await searchParams;
  const filter = ORDER_FILTERS.find((option) => option.value === params.status)?.value ?? "all";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const after = isUuid(params.after) ? params.after : undefined;

  const { orders, nextCursor } = await listOrdersForAdmin({ filter, query, after });

  return (
    <>
      <ListControls
        label="orders"
        action="/admin/orders"
        options={ORDER_FILTERS}
        filter={filter}
        query={query}
        searchLabel="Search by reference or email"
        placeholder="Reference or email"
        hrefFor={(value) => ordersHref(value, query)}
      />

      {orders.length === 0 ? (
        <div className="mt-6 border p-8 text-center">
          <p className="text-body-s text-muted">
            {after ? "No more orders." : "No orders match this view."}
          </p>
          <Link href="/admin/orders" prefetch={false} className="link mt-3 inline-block text-body-s">
            View all orders
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border-t">
          <table className="w-full text-left text-body-s">
            <thead>
              <tr className="border-b text-caption text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-normal">Order</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal md:table-cell">Customer</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">Placed</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">Method</th>
                <th scope="col" className="py-3 pr-4 font-normal">Status</th>
                <th scope="col" className="py-3 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b align-top">
                  <td className="py-4 pr-4">
                    <Link href={`/admin/orders/${order.id}`} prefetch={false} className="link">
                      {order.reference}
                    </Link>
                    <p className="mt-1 text-caption text-muted lg:hidden">{formatDateTime(order.createdAt)}</p>
                    <p className="mt-1 max-w-40 truncate text-caption text-muted md:hidden">{order.email}</p>
                  </td>
                  <td className="hidden py-4 pr-4 md:table-cell">
                    <p>{order.receiverName}</p>
                    <p className="mt-1 text-caption text-muted">{order.email}</p>
                  </td>
                  <td className="hidden py-4 pr-4 whitespace-nowrap lg:table-cell">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="hidden py-4 pr-4 lg:table-cell">
                    {order.delivery === "pickup" ? "Pickup" : "Delivery"}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap items-start gap-1">
                      <OrderStatusBadge status={order.status} overdue={order.overdue} />
                      {order.status === "paid" && <FulfilmentBadge status={order.fulfilmentStatus} />}
                    </div>
                  </td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <p>{formatPriceExact(order.totalCents)}</p>
                    <p className="mt-1 text-caption text-muted">
                      {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPager
        newestHref={after ? ordersHref(filter, query) : undefined}
        olderHref={nextCursor ? ordersHref(filter, query, nextCursor) : undefined}
      />
    </>
  );
}
