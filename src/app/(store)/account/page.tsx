import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Services } from "@/components/home/services";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export default function AccountPage() {
  return (
    <>
      <section aria-labelledby="account-title" className="page pt-6 pb-(--section-y)">
        <Breadcrumb crumbs={[{ label: "My Account" }]} />

        {/* The session lives in a cookie: read it inside Suspense */}
        <Suspense fallback={<AccountSkeleton />}>
          <AccountDetails />
        </Suspense>
      </section>

      <Services />
    </>
  );
}

async function AccountDetails() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirectTo=/account");

  const { user } = session;
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <>
      <header className="mt-8 flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-end sm:justify-between lg:mt-12 lg:pb-8">
        <div>
          <p className="eyebrow text-muted">My Account</p>
          <h1 id="account-title" className="mt-2 text-title-xl">
            Welcome, {firstName}
          </h1>
        </div>
        <SignOutButton className="shrink-0" />
      </header>

      <div className="grid-layout gap-y-10 pt-8 lg:pt-12">
        <div className="col-span-4 lg:col-span-6">
          <h2 className="eyebrow">Account Details</h2>
          <dl className="mt-6 flex flex-col border-t text-body-s">
            <div className="flex justify-between gap-6 border-b py-4">
              <dt className="text-muted">Name</dt>
              <dd className="min-w-0 truncate">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b py-4">
              <dt className="text-muted">Email</dt>
              <dd className="min-w-0 truncate">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b py-4">
              <dt className="text-muted">Member since</dt>
              <dd>{memberSince.format(new Date(user.createdAt))}</dd>
            </div>
          </dl>
        </div>

        <div className="col-span-4 flex flex-col gap-4 lg:col-span-5 lg:col-start-8">
          <div className="bg-surface p-6 lg:p-8">
            <h2 className="eyebrow">Your Orders</h2>
            <p className="mt-3 text-body-s text-muted">
              Track your deliveries and review your past orders.
            </p>
            <div className="mt-6">
              <Link href="/account/orders" prefetch={false} className="btn btn-primary">
                View orders
              </Link>
            </div>
          </div>

          <div className="bg-surface p-6 lg:p-8">
            <h2 className="eyebrow">Continue Shopping</h2>
            <p className="mt-3 text-body-s text-muted">
              Pick up where you left off, or discover the latest arrivals.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/bag" className="btn btn-primary">
                View bag
              </Link>
              <Link href="/new-in" className="btn btn-secondary">
                Shop new in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mirrors the heading and details so nothing shifts when it streams in
function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading account">
      <div className="mt-8 border-b pb-6 lg:mt-12 lg:pb-8">
        <div className="h-4 w-24 bg-surface" />
        <div className="mt-2 h-10 w-64 bg-surface lg:h-14" />
      </div>
      <div className="grid-layout gap-y-10 pt-8 lg:pt-12">
        <div className="col-span-4 h-48 bg-surface lg:col-span-6" />
        <div className="col-span-4 h-48 bg-surface lg:col-span-5 lg:col-start-8" />
      </div>
    </div>
  );
}
