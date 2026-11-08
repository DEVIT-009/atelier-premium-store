// Staff access to accounts. Every function checks the role itself and reads are
// never cached. Each action is one statement that changes the account, ends its
// sessions and writes the audit row together.
import { aliasedTable, and, desc, eq, ilike, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, session, user, userEvents } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

// The account is gone, or changed since staff loaded the page
export class UserChangedError extends Error {}

// Thrown when an action can't apply; the message is safe to show to staff
export class UserActionError extends Error {}

// Shown at the top of the user page after an action
export const USER_NOTICES = {
  blocked: { tone: "success", message: "Account blocked and signed out everywhere." },
  unblocked: { tone: "success", message: "Account unblocked. They can sign in again." },
  signed_out: { tone: "success", message: "Signed out everywhere." },
  promoted: { tone: "success", message: "Admin access given. It applies from their next page load." },
  demoted: { tone: "success", message: "Admin access removed. It applies from their next page load." },
  changed: { tone: "error", message: "This account just changed. Review it and try again." },
} as const;

export type UserNotice = keyof typeof USER_NOTICES;

const PAGE_SIZE = 25;

export const USER_FILTERS = [
  { value: "all", label: "All" },
  { value: "customers", label: "Customers" },
  { value: "admins", label: "Admins" },
  { value: "blocked", label: "Blocked" },
] as const;

export type UserFilter = (typeof USER_FILTERS)[number]["value"];

// The dashboard counts with these too, so its numbers match the lists
export const USER_FILTER_CONDITIONS: Record<UserFilter, () => SQL | undefined> = {
  all: () => undefined,
  customers: () => ne(user.role, "admin"),
  admins: () => eq(user.role, "admin"),
  blocked: () => isNotNull(user.blockedAt),
};

// Better Auth's ids: letters and digits
export function isUserId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// Only orders accepted as paid count as spent: late, cancelled and refunded ones
// don't. The table is named: on its own, "id" would mean the order's id here.
const paidCents = sql<number>`(
  select coalesce(sum(o.total_cents), 0)::int from ${orders} o where o.user_id = ${user}.id and o.status = 'paid'
)`;
const orderCount = sql<number>`(select count(*)::int from ${orders} o where o.user_id = ${user}.id)`;

// When their current admin access began. Null for customers, and for admins
// promoted by hand in the database, which leaves no record.
const adminSince = sql<Date | null>`(
  select max(e.created_at) from ${userEvents} e
  where e.user_id = ${user}.id and e.action = 'promoted' and ${user}.role = 'admin'
)`.mapWith((value) => (value ? new Date(value) : null));

// Newest first. `after` is the id of the last user on the previous page; the
// database compares its own created_at, which is more precise than a JS Date.
export async function listUsersForAdmin({
  filter,
  query,
  after,
}: {
  filter: UserFilter;
  query: string;
  after?: string;
}) {
  await requireAdmin("/admin/users");

  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      blockedAt: user.blockedAt,
      createdAt: user.createdAt,
      orderCount,
      paidCents,
      adminSince,
    })
    .from(user)
    .where(
      and(
        USER_FILTER_CONDITIONS[filter](),
        query ? or(ilike(user.name, pattern), ilike(user.email, pattern)) : undefined,
        after
          ? sql`(${user.createdAt}, ${user.id}) < (select u.created_at, u.id from ${user} u where u.id = ${after})`
          : undefined,
      ),
    )
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(PAGE_SIZE + 1);

  return {
    users: rows.slice(0, PAGE_SIZE),
    nextCursor: rows.length > PAGE_SIZE ? rows[PAGE_SIZE - 1].id : null,
  };
}

const actor = aliasedTable(user, "actor");

export async function getUserForAdmin(id: string) {
  await requireAdmin(`/admin/users/${id}`);

  if (!isUserId(id)) return undefined;
  const [found] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      blockedAt: user.blockedAt,
      createdAt: user.createdAt,
      orderCount,
      paidCents,
      adminSince,
    })
    .from(user)
    .where(eq(user.id, id));
  if (!found) return undefined;

  const [recentOrders, sessions, events] = await db.batch([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        status: orders.status,
        fulfilmentStatus: orders.fulfilmentStatus,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        overdue: sql<boolean>`${orders.status} = 'pending' and ${orders.expiresAt} < now()`,
      })
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(20),
    // Expired sessions can't be used, so they aren't shown
    db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(and(eq(session.userId, id), sql`${session.expiresAt} > now()`))
      .orderBy(desc(session.updatedAt)),
    db
      .select({
        id: userEvents.id,
        action: userEvents.action,
        reason: userEvents.reason,
        sessionsEnded: userEvents.sessionsEnded,
        createdAt: userEvents.createdAt,
        actorEmail: actor.email,
      })
      .from(userEvents)
      .innerJoin(actor, eq(userEvents.actorId, actor.id))
      .where(eq(userEvents.userId, id))
      .orderBy(desc(userEvents.createdAt), desc(userEvents.id)),
  ]);

  return { ...found, recentOrders, sessions, events };
}

// Appended to a statement with a `target` CTE returning the account's id: ends
// its sessions and records the action with how many devices were signed out
function endSessionsAndLog(event: { actorId: string; action: string; reason: string | null }) {
  return sql`
    ended as (
      delete from ${session} where user_id in (select id from target) returning id
    ), logged as (
      insert into ${userEvents} (user_id, actor_id, action, reason, sessions_ended)
      select id, ${event.actorId}::text, ${event.action}::user_event_action, ${event.reason}::text,
        (select count(*)::int from ended)
      from target
      returning id
    )
  `;
}

const notYourself = new UserActionError(
  "You can't do this to your own account. Use Sign out at the top of the page for this device.",
);

// Ends every session, on every device. The account itself doesn't change.
export async function signOutEverywhere(id: string, reason: string) {
  const { user: admin } = await requireAdmin();
  if (id === admin.id) throw notYourself;

  const result = await db.execute(sql`
    with target as (
      select id from ${user} where id = ${id}
    ), ${endSessionsAndLog({ actorId: admin.id, action: "signed_out", reason })}
    select id from target
  `);
  if (result.rows.length === 0) throw new UserChangedError();
}

// Admins can't be blocked: their admin access is removed first, which keeps the
// last-admin rule in one place
export async function blockUser(id: string, reason: string) {
  const { user: admin } = await requireAdmin();
  if (id === admin.id) throw notYourself;

  const result = await db.execute(sql`
    with target as (
      update ${user} set blocked_at = now(), updated_at = now()
      where id = ${id} and blocked_at is null and role <> 'admin'
      returning id
    ), ${endSessionsAndLog({ actorId: admin.id, action: "blocked", reason })}
    select id from target
  `);
  if (result.rows.length > 0) return;

  const [found] = await db.select({ role: user.role }).from(user).where(eq(user.id, id));
  if (found?.role === "admin") {
    throw new UserActionError("Admins can't be blocked. Remove their admin access first.");
  }
  throw new UserChangedError();
}

export async function unblockUser(id: string, reason: string | null) {
  const { user: admin } = await requireAdmin();

  const result = await db.execute(sql`
    with claimed as (
      update ${user} set blocked_at = null, updated_at = now()
      where id = ${id} and blocked_at is not null
      returning id
    ), logged as (
      insert into ${userEvents} (user_id, actor_id, action, reason)
      select id, ${admin.id}::text, 'unblocked', ${reason}::text from claimed
      returning id
    )
    select id from claimed
  `);
  if (result.rows.length === 0) throw new UserChangedError();
}

// Only the acting admin's own, still-valid access lets these statements run, even
// if it was removed after requireAdmin() checked it
function actorIsAdmin(actorId: string) {
  return sql`exists (select 1 from ${user} a where a.id = ${actorId} and a.role = 'admin' and a.blocked_at is null)`;
}

function logRoleChange(actorId: string, action: "promoted" | "demoted", reason: string) {
  return sql`
    logged as (
      insert into ${userEvents} (user_id, actor_id, action, reason)
      select id, ${actorId}::text, ${action}::user_event_action, ${reason}::text from claimed
      returning id
    )
  `;
}

// Sign-up has no email verification, so typing the email confirms staff mean
// this exact account. Blocked accounts are unblocked first.
export async function promoteToAdmin(id: string, reason: string, confirmEmail: string) {
  const { user: admin } = await requireAdmin();

  const result = await db.execute(sql`
    with claimed as (
      update ${user} set role = 'admin', updated_at = now()
      where id = ${id} and role <> 'admin' and blocked_at is null
        and lower(email) = lower(${confirmEmail})
        and ${actorIsAdmin(admin.id)}
      returning id
    ), ${logRoleChange(admin.id, "promoted", reason)}
    select id from claimed
  `);
  if (result.rows.length > 0) return;

  const [found] = await db
    .select({ email: user.email, role: user.role, blockedAt: user.blockedAt })
    .from(user)
    .where(eq(user.id, id));
  if (found && found.role !== "admin") {
    if (found.blockedAt) throw new UserActionError("Unblock this account before giving it admin access.");
    if (found.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      throw new UserActionError("The email doesn't match this account. Type it exactly to confirm.");
    }
  }
  throw new UserChangedError();
}

// The store keeps at least one admin. The admin rows are locked while counting,
// so two admins removing each other at the same moment can't leave none.
export async function demoteAdmin(id: string, reason: string) {
  const { user: admin } = await requireAdmin();
  if (id === admin.id) {
    throw new UserActionError("You can't remove your own admin access. Ask another admin to do it.");
  }

  const result = await db.execute(sql`
    with admins as (
      select id from ${user} where role = 'admin' for update
    ), claimed as (
      update ${user} set role = 'user', updated_at = now()
      where id = ${id} and role = 'admin'
        and (select count(*) from admins) > 1
        and ${actorIsAdmin(admin.id)}
      returning id
    ), ${logRoleChange(admin.id, "demoted", reason)}
    select id from claimed
  `);
  if (result.rows.length > 0) return;

  const [{ admins }] = await db.select({ admins: sql<number>`count(*)::int` }).from(user).where(eq(user.role, "admin"));
  const [found] = await db.select({ role: user.role }).from(user).where(eq(user.id, id));
  if (found?.role === "admin" && admins <= 1) {
    throw new UserActionError("This is the store's only admin, so their access can't be removed.");
  }
  throw new UserChangedError();
}
