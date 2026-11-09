import Image from "next/image";
import Link from "next/link";
import { CopyReference } from "@/components/account/copy-reference";
import { OrderStageBadge } from "@/components/account/order-stage-badge";
import type { OrderListEntry } from "@/lib/account-orders";
import { formatDate, formatPriceExact } from "@/lib/format";

// The reference link stretches over the row so the whole row opens the order.
// The copy button sits above it, because a button can't go inside a link.
export function OrderList({ orders }: { orders: OrderListEntry[] }) {
  return (
    <ul className="border-t">
      {orders.map((order) => (
        <li key={order.id} className="group relative flex gap-4 border-b py-6 lg:gap-6">
          <div className="media-frame aspect-portrait w-20 shrink-0 sm:w-24">
            {order.firstItem && (
              <Image src={order.firstItem.image} alt="" fill sizes="(min-width: 640px) 96px, 80px" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-caption text-muted uppercase">{formatDate(order.placedAt)}</p>
              <div className="mt-1 flex items-center gap-1">
                <h2 className="min-w-0 text-title-s break-words">
                  <Link
                    href={`/account/orders/${order.id}`}
                    prefetch={false}
                    className="after:absolute after:inset-0"
                  >
                    {order.reference}
                  </Link>
                </h2>
                <CopyReference reference={order.reference} className="relative z-10 -my-2" />
              </div>
              <p className="mt-1 truncate text-body-s text-muted">
                {order.firstItem?.name}
                {order.otherLines > 0 && ` + ${order.otherLines} more`}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
              <OrderStageBadge stage={order.stage} />
              <p className="text-body-s">
                <span className="sr-only">Total </span>
                {formatPriceExact(order.total)}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
