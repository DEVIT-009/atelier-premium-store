import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { OrderList } from "@/components/account/order-list";
import { ListPager } from "@/components/admin/list-controls";
import { listOrdersForUser } from "@/lib/account-orders";
import { isUuid } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false },
};

export default function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  return (
    <section aria-labelledby="orders-title" className="page pt-6 pb-(--section-y)">
      <Breadcrumb crumbs={[{ label: "My Account", href: "/account" }, { label: "Orders" }]} />

      <header className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
        <p className="eyebrow text-muted">My Account</p>
        <h1 id="orders-title" className="mt-2 text-title-xl">
          Your Orders
        </h1>
      </header>

      {/* The session and ?after= are request data: read them inside Suspense */}
      <Suspense fallback={<OrdersSkeleton />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/account/orders">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/account/orders");

  const params = await searchParams;
  const after = isUuid(params.after) ? params.after : undefined;
  const { orders, nextCursor } = await listOrdersForUser(session.user.id, after);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 pt-8 lg:pt-12">
        <p className="text-lead text-muted">
          {after ? "No more orders." : "You haven't placed an order yet."}
        </p>
        <Link href="/new-in" className="btn btn-primary">
          Shop new in
        </Link>
      </div>
    );
  }

  return (
    <div className="-mt-px">
      <OrderList orders={orders} />
      <ListPager
        newestHref={after ? "/account/orders" : undefined}
        olderHref={nextCursor ? `/account/orders?after=${nextCursor}` : undefined}
      />
    </div>
  );
}

// Mirrors the order rows so nothing shifts when they stream in
function OrdersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your orders">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4 border-b py-6 lg:gap-6">
          <div className="aspect-portrait w-20 shrink-0 bg-surface sm:w-24" />
          <div className="h-16 flex-1 bg-surface" />
        </div>
      ))}
    </div>
  );
}
