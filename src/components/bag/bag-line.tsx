import Image from "next/image";
import Link from "next/link";
import { removeFromBag, setBagQuantity } from "@/app/(store)/bag/actions";
import { PendingButton } from "@/components/form/pending-button";
import { formatPrice } from "@/lib/format";
import { MAX_QUANTITY, type BagLine as BagLineType } from "@/lib/bag";
import { getStockLabel, getStockStatus } from "@/lib/products";

export function BagLine({ line }: { line: BagLineType }) {
  const { product, quantity, stock, available } = line;
  const status = getStockStatus(stock);
  const soldOut = status === "sold-out";
  const href = `/products/${product.slug}`;
  const max = Math.min(stock, MAX_QUANTITY);

  return (
    <li className="flex gap-4 border-b py-6 lg:gap-6 lg:py-8">
      <Link
        href={href}
        className="group media-frame aspect-portrait w-24 shrink-0 sm:w-32 lg:w-40"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={product.image.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 160px, (min-width: 640px) 128px, 96px"
          className={soldOut ? "opacity-60" : undefined}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-caption text-muted uppercase">
              {product.category.name}
            </p>
            <h2 className="text-body-s lg:text-body">
              <Link href={href} className="link-quiet">
                {product.name}
              </Link>
            </h2>
          </div>
          <p className="shrink-0 text-body-s lg:text-body">
            {formatPrice(product.price * Math.max(available, 1))}
          </p>
        </div>

        {(status !== "in-stock" || available < quantity) && (
          <p
            className={`mt-2 text-caption uppercase ${soldOut ? "text-error" : "text-muted"}`}
          >
            {soldOut
              ? "Sold out — remove to continue"
              : available < quantity
                ? `Only ${stock} available`
                : getStockLabel(stock)}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          {soldOut ? (
            <span />
          ) : (
            <div
              role="group"
              aria-label={`Quantity for ${product.name}`}
              className="flex h-10 items-center border"
            >
              <form action={setBagQuantity.bind(null, product.slug, available - 1)}>
                <PendingButton
                  className="grid size-10 cursor-pointer place-items-center disabled:cursor-not-allowed disabled:text-muted"
                  aria-label={
                    available <= 1
                      ? `Remove ${product.name}`
                      : `Decrease quantity of ${product.name}`
                  }
                >
                  <span aria-hidden="true">−</span>
                </PendingButton>
              </form>
              <output
                aria-live="polite"
                className="w-8 text-center text-body-s tabular-nums"
              >
                {available}
              </output>
              <form action={setBagQuantity.bind(null, product.slug, available + 1)}>
                <PendingButton
                  className="grid size-10 cursor-pointer place-items-center disabled:cursor-not-allowed disabled:text-muted"
                  aria-label={`Increase quantity of ${product.name}`}
                  disabled={available >= max}
                >
                  <span aria-hidden="true">+</span>
                </PendingButton>
              </form>
            </div>
          )}

          <form action={removeFromBag.bind(null, product.slug)}>
            <PendingButton
              className="nav-link link cursor-pointer text-muted hover:text-foreground disabled:opacity-50"
              aria-label={`Remove ${product.name} from bag`}
            >
              Remove
            </PendingButton>
          </form>
        </div>
      </div>
    </li>
  );
}
