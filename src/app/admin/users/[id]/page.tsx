import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  blockUserAction,
  demoteAdminAction,
  promoteToAdminAction,
  signOutEverywhereAction,
  unblockUserAction,
} from "@/app/admin/users/actions";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminNotice } from "@/components/admin/admin-notice";
import { FulfilmentBadge, OrderStatusBadge } from "@/components/admin/order-status";
import { Details, Panel } from "@/components/admin/panel";
import { UserBadges } from "@/components/admin/user-status";
import { Field } from "@/components/form/field";
import { requireAdmin } from "@/lib/admin";
import { getUserForAdmin, USER_NOTICES, type UserNotice } from "@/lib/admin-users";
import { formatDateTime, formatPriceExact } from "@/lib/format";

export const metadata: Metadata = {
  title: "User",
};

// requireAdmin() can stop the render, which dev-only instant validation reports as an error
export const instant = false;

type Account = NonNullable<Awaited<ReturnType<typeof getUserForAdmin>>>;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

const EVENT_LABELS: Record<Account["events"][number]["action"], string> = {
  blocked: "Blocked",
  unblocked: "Unblocked",
  signed_out: "Signed out everywhere",
  promoted: "Given admin access",
  demoted: "Admin access removed",
};

// Actions that end sessions say how many
const ENDS_SESSIONS = new Set(["blocked", "signed_out"]);

function devices(count: number) {
  return `${count} ${count === 1 ? "device" : "devices"}`;
}

export default function AdminUserPage({ params, searchParams }: PageProps) {
  return (
    <section className="page pt-8 pb-(--section-y) lg:pt-12">
      <Link href="/admin/users" prefetch={false} className="nav-link link-quiet">
        ← Users
      </Link>

      {/* The session and params are request data: read them inside Suspense */}
      <Suspense fallback={<div aria-busy="true" aria-label="Loading user" className="mt-6 h-96 bg-surface" />}>
        <UserDetail params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function UserDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { user: admin } = await requireAdmin(`/admin/users/${id}`);

  const account = await getUserForAdmin(id);
  if (!account) notFound();

  const { notice: noticeKey } = await searchParams;
  const notice = typeof noticeKey === "string" ? USER_NOTICES[noticeKey as UserNotice] : undefined;
  const lastBlock = account.events.find((event) => event.action === "blocked");

  return (
    <>
      <header className="mt-4 border-b pb-6 lg:pb-8">
        <h1 className="text-title-l wrap-anywhere">{account.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <UserBadges role={account.role} blockedAt={account.blockedAt} />
          <span className="text-caption wrap-anywhere text-muted">{account.email}</span>
        </div>
      </header>

      {notice && <AdminNotice notice={notice} className="mt-6" />}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <Panel title="Account">
            <Details
              rows={[
                ["Name", account.name],
                ["Email", account.email],
                ["Role", account.role === "admin" ? "Admin" : "Customer"],
                [
                  "Admin since",
                  account.role !== "admin"
                    ? null
                    : account.adminSince
                      ? formatDateTime(account.adminSince)
                      : "Before admin access was recorded",
                ],
                ["Joined", formatDateTime(account.createdAt)],
                ["Orders", String(account.orderCount)],
                ["Paid orders", formatPriceExact(account.paidCents)],
                ["Blocked since", account.blockedAt && formatDateTime(account.blockedAt)],
                ["Block reason", account.blockedAt ? (lastBlock?.reason ?? null) : null],
              ]}
            />
          </Panel>

          <Panel title="Orders">
            {account.recentOrders.length === 0 ? (
              <p className="text-body-s text-muted">No orders yet.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-3 text-body-s">
                  {account.recentOrders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <Link href={`/admin/orders/${order.id}`} prefetch={false} className="link">
                          {order.reference}
                        </Link>
                        <p className="mt-1 text-caption text-muted">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={order.status} overdue={order.overdue} />
                        {order.status === "paid" && <FulfilmentBadge status={order.fulfilmentStatus} />}
                        <span className="whitespace-nowrap">{formatPriceExact(order.totalCents)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {account.orderCount > account.recentOrders.length && (
                  <Link
                    href={`/admin/orders?q=${encodeURIComponent(account.email)}`}
                    prefetch={false}
                    className="link mt-4 inline-block text-body-s"
                  >
                    All {account.orderCount} orders
                  </Link>
                )}
              </>
            )}
          </Panel>

          <Panel title="Signed in on">
            {account.sessions.length === 0 ? (
              <p className="text-body-s text-muted">Not signed in anywhere.</p>
            ) : (
              <ul className="flex flex-col gap-4 text-body-s">
                {account.sessions.map((device) => (
                  <li key={device.id}>
                    <p className="wrap-anywhere">{device.userAgent || "Unknown device"}</p>
                    <p className="mt-1 text-caption text-muted">
                      {device.ipAddress ? `${device.ipAddress} · ` : ""}
                      Signed in {formatDateTime(device.createdAt)} · Last active {formatDateTime(device.updatedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="History">
            {account.events.length === 0 ? (
              <p className="text-body-s text-muted">No staff actions yet.</p>
            ) : (
              <ol className="flex flex-col gap-4 text-body-s">
                {account.events.map((event) => (
                  <li key={event.id}>
                    <p>
                      {EVENT_LABELS[event.action]}
                      {ENDS_SESSIONS.has(event.action) && (
                        <span className="text-muted"> · {devices(event.sessionsEnded)} signed out</span>
                      )}
                    </p>
                    {event.reason && <p className="mt-1 text-muted">{event.reason}</p>}
                    <p className="mt-1 text-caption text-muted">
                      {event.actorEmail} · {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <aside aria-label="User actions" className="flex min-w-0 flex-col gap-10">
          <UserActions account={account} isYou={account.id === admin.id} />
        </aside>
      </div>
    </>
  );
}

// Each block appears only when it applies; the server re-checks
function UserActions({ account, isYou }: { account: Account; isYou: boolean }) {
  if (isYou) {
    return (
      <Panel title="Your account">
        <p className="text-body-s text-muted">
          You can&apos;t block, sign out or remove admin access from your own account here. Use Sign out at
          the top of the page. Another admin can remove your access.
        </p>
      </Panel>
    );
  }

  return (
    <>
      {account.blockedAt ? (
        <Panel title="Unblock">
          <p className="mb-4 text-body-s text-muted">
            They can sign in and place orders again. The app sends no email, so tell them yourself.
          </p>
          <AdminActionForm
            action={unblockUserAction}
            hidden={{ userId: account.id }}
            label="Unblock account"
            pendingLabel="Unblocking…"
            primary
          >
            <Field id="unblock-reason" name="reason" label="Note" maxLength={300} />
          </AdminActionForm>
        </Panel>
      ) : (
        <>
          <Panel title="Sign out everywhere">
            <p className="mb-4 text-body-s text-muted">
              Ends their sessions on {account.sessions.length === 0 ? "every device" : devices(account.sessions.length)}.
              They can sign in again with their password.
            </p>
            <AdminActionForm
              action={signOutEverywhereAction}
              hidden={{ userId: account.id }}
              label="Sign out everywhere"
              pendingLabel="Signing out…"
            >
              <Field id="signout-reason" name="reason" label="Reason" required maxLength={300} />
            </AdminActionForm>
          </Panel>

          {account.role === "admin" ? (
            <>
              <Panel title="Admin access">
                <p className="mb-4 text-body-s text-muted">
                  Removes their access to the admin area from their next page load. They keep their account and
                  orders. The store always keeps at least one admin.
                </p>
                <AdminActionForm
                  action={demoteAdminAction}
                  hidden={{ userId: account.id }}
                  label="Remove admin access"
                  pendingLabel="Removing…"
                >
                  <Field id="demote-reason" name="reason" label="Reason" required maxLength={300} />
                </AdminActionForm>
              </Panel>
              <Panel title="Block">
                <p className="text-body-s text-muted">
                  Admins can&apos;t be blocked. Remove their admin access first.
                </p>
              </Panel>
            </>
          ) : (
            <>
              <Panel title="Admin access">
                <p className="mb-4 text-body-s text-muted">
                  Gives full access to the admin area: orders, refunds, products and users. Anyone can sign up
                  with any email address without proving it&apos;s theirs, so only do this for an account you
                  know belongs to your staff.
                </p>
                <AdminActionForm
                  action={promoteToAdminAction}
                  hidden={{ userId: account.id }}
                  label="Give admin access"
                  pendingLabel="Giving access…"
                >
                  <Field id="promote-reason" name="reason" label="Reason" required maxLength={300} />
                  <Field
                    id="promote-confirm"
                    name="confirmEmail"
                    label="Type their email to confirm"
                    required
                    type="email"
                    autoComplete="off"
                    maxLength={320}
                    hint={account.email}
                  />
                </AdminActionForm>
              </Panel>
              <Panel title="Block">
                <p className="mb-4 text-body-s text-muted">
                  Signs them out everywhere and stops them signing in, so they can&apos;t place orders. Their
                  orders stay as they are, including any awaiting payment.
                </p>
                <AdminActionForm
                  action={blockUserAction}
                  hidden={{ userId: account.id }}
                  label="Block account"
                  pendingLabel="Blocking…"
                >
                  <Field id="block-reason" name="reason" label="Reason" required maxLength={300} />
                </AdminActionForm>
              </Panel>
            </>
          )}
        </>
      )}
    </>
  );
}
