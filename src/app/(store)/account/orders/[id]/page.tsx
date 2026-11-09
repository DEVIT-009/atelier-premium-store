import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { OrderDetails } from "@/components/account/order-details";
import { getOrderDetailForUser } from "@/lib/account-orders";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false },
};

export default function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <section aria-labelledby="order-title" className="page pt-6 pb-(--section-y)">
      <Breadcrumb
        crumbs={[
          { label: "My Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: "Order" },
        ]}
      />

      {/* The session and the order are request data: read them inside Suspense */}
      <Suspense fallback={<OrderSkeleton />}>
        <Order params={params} />
      </Suspense>
    </section>
  );
}

// Someone else's order is a 404, the same as one that doesn't exist
async function Order({ params }: { params: PageProps<"/account/orders/[id]">["params"] }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?redirectTo=${encodeURIComponent(`/account/orders/${id}`)}`);

  const order = await getOrderDetailForUser(id, session.user.id);
  if (!order) notFound();

  return <OrderDetails order={order} />;
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order">
      <div className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
        <div className="h-4 w-32 bg-surface" />
        <div className="mt-2 h-10 w-64 bg-surface lg:h-14" />
      </div>
      <div className="grid-layout gap-y-10 pt-8 lg:pt-12">
        <div className="col-span-4 h-96 bg-surface lg:col-span-7" />
        <div className="col-span-4 h-96 bg-surface lg:col-span-4 lg:col-start-9" />
      </div>
    </div>
  );
}
