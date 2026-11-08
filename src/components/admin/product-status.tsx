import type { ProductStatus } from "@/lib/admin-products";

const STATUS: Record<ProductStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-success text-success" },
  draft: { label: "Draft", className: "" },
  archived: { label: "Archived", className: "text-muted" },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span className={`inline-block border px-2 py-1 text-caption whitespace-nowrap uppercase ${className}`}>
      {label}
    </span>
  );
}
