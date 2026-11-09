import { badge } from "@/components/admin/order-status";
import type { OrderStage } from "@/lib/account-orders";

const STAGES: Record<OrderStage, { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting payment", className: "" },
  under_review: { label: "Under review", className: "border-error text-error" },
  confirmed: { label: "Confirmed", className: "" },
  processing: { label: "Preparing", className: "" },
  shipped: { label: "On its way", className: "" },
  ready_for_pickup: { label: "Ready for pickup", className: "" },
  delivered: { label: "Delivered", className: "border-success text-success" },
  collected: { label: "Collected", className: "border-success text-success" },
  expired: { label: "Expired", className: "text-muted" },
  cancelled: { label: "Cancelled", className: "text-muted" },
  refunded: { label: "Refunded", className: "text-muted" },
};

export function OrderStageBadge({ stage }: { stage: OrderStage }) {
  const { label, className } = STAGES[stage];
  return <span className={`${badge} ${className}`}>{label}</span>;
}
