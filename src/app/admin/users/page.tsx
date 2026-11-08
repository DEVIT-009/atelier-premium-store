import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListControls, ListPager } from "@/components/admin/list-controls";
import { UserBadges } from "@/components/admin/user-status";
import { requireAdmin } from "@/lib/admin";
import { isUserId, listUsersForAdmin, USER_FILTERS, type UserFilter } from "@/lib/admin-users";
import { formatDateTime, formatPriceExact } from "@/lib/format";

export const metadata: Metadata = {
  title: "Users",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function usersHref(filter: UserFilter, query: string, after?: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (query) params.set("q", query);
  if (after) params.set("after", after);
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}

export default function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section aria-labelledby="admin-users-title" className="page pt-8 pb-(--section-y) lg:pt-12">
      <header className="border-b pb-6 lg:pb-8">
        <p className="eyebrow text-muted">Admin</p>
        <h1 id="admin-users-title" className="mt-2 text-title-l">
          Users
        </h1>
      </header>

      {/* The session and search params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading users" className="mt-6 h-96 bg-surface" />}>
        <Users searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Users({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/users");

  const params = await searchParams;
  const filter = USER_FILTERS.find((option) => option.value === params.status)?.value ?? "all";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const after = isUserId(params.after) ? params.after : undefined;

  const { users, nextCursor } = await listUsersForAdmin({ filter, query, after });

  return (
    <>
      <ListControls
        label="users"
        action="/admin/users"
        options={USER_FILTERS}
        filter={filter}
        query={query}
        searchLabel="Search by name or email"
        placeholder="Name or email"
        hrefFor={(value) => usersHref(value, query)}
      />

      {users.length === 0 ? (
        <div className="mt-6 border p-8 text-center">
          <p className="text-body-s text-muted">{after ? "No more users." : "No users match this view."}</p>
          <Link href="/admin/users" prefetch={false} className="link mt-3 inline-block text-body-s">
            View all users
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border-t">
          <table className="w-full text-left text-body-s">
            <thead>
              <tr className="border-b text-caption text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-normal">User</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">Joined</th>
                <th scope="col" className="hidden py-3 pr-4 font-normal sm:table-cell">Orders</th>
                <th scope="col" className="py-3 text-right font-normal">Paid</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id} className="border-b align-top">
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/users/${account.id}`} prefetch={false} className="link wrap-anywhere">
                        {account.name}
                      </Link>
                      <UserBadges role={account.role} blockedAt={account.blockedAt} />
                    </div>
                    <p className="mt-1 text-caption wrap-anywhere text-muted">{account.email}</p>
                    {account.adminSince && (
                      <p className="mt-1 text-caption text-muted">Admin since {formatDateTime(account.adminSince)}</p>
                    )}
                    <p className="mt-1 text-caption text-muted lg:hidden">Joined {formatDateTime(account.createdAt)}</p>
                  </td>
                  <td className="hidden py-4 pr-4 whitespace-nowrap lg:table-cell">
                    {formatDateTime(account.createdAt)}
                  </td>
                  <td className="hidden py-4 pr-4 sm:table-cell">{account.orderCount}</td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <p>{formatPriceExact(account.paidCents)}</p>
                    <p className="mt-1 text-caption text-muted sm:hidden">
                      {account.orderCount} {account.orderCount === 1 ? "order" : "orders"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPager
        newestHref={after ? usersHref(filter, query) : undefined}
        olderHref={nextCursor ? usersHref(filter, query, nextCursor) : undefined}
      />
    </>
  );
}
