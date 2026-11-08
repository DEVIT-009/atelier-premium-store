import type { FulfilmentStatus } from "@/lib/admin-orders";
import type { OrderStatus } from "@/lib/orders";

const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Awaiting payment", className: "" },
  paid: { label: "Paid", className: "border-success text-success" },
  paid_late: { label: "Paid late", className: "border-error text-error" },
  expired: { label: "Expired", className: "text-muted" },
  cancelled: { label: "Cancelled", className: "text-muted" },
  refunded: { label: "Refunded", className: "text-muted" },
};

export const FULFILMENT_LABELS: Record<FulfilmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  ready_for_pickup: "Ready for pickup",
  collected: "Collected",
};

// Readable name for an order or fulfilment status, as stored in order_events
export function statusLabel(status: string) {
  return (
    ORDER_STATUS[status as OrderStatus]?.label ?? FULFILMENT_LABELS[status as FulfilmentStatus] ?? status
  );
}

export const badge = "inline-block border px-2 py-1 text-caption whitespace-nowrap uppercase";

// `overdue`: still pending, but past its QR's lifetime and waiting for expiry to run
export function OrderStatusBadge({ status, overdue }: { status: OrderStatus; overdue?: boolean }) {
  if (overdue) return <span className={`${badge} border-error text-error`}>Overdue</span>;

  const { label, className } = ORDER_STATUS[status];
  return <span className={`${badge} ${className}`}>{label}</span>;
}

export function FulfilmentBadge({ status }: { status: FulfilmentStatus }) {
  return <span className={`${badge} text-muted`}>{FULFILMENT_LABELS[status]}</span>;
}
