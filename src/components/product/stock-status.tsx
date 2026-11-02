import { getStockLabel, getStockStatus } from "@/lib/products";

const dotColor = {
  "in-stock": "bg-success",
  "low-stock": "bg-foreground",
  "sold-out": "bg-error",
} as const;

export function StockStatus({
  stock,
  className = "",
}: {
  stock: number;
  className?: string;
}) {
  const status = getStockStatus(stock);

  return (
    <p className={`flex items-center gap-2 text-body-s ${className}`}>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dotColor[status]}`}
      />
      {getStockLabel(stock)}
    </p>
  );
}
