import { badge } from "@/components/admin/order-status";

// Customers get no badge: only what's different about an account is shown
export function UserBadges({ role, blockedAt }: { role: string; blockedAt: Date | null }) {
  return (
    <>
      {role === "admin" && <span className={badge}>Admin</span>}
      {blockedAt && <span className={`${badge} border-error text-error`}>Blocked</span>}
    </>
  );
}
