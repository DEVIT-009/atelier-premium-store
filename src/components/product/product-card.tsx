import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getStockLabel, getStockStatus, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const status = getStockStatus(product.stock);
  const soldOut = status === "sold-out";
  const badge = soldOut ? "Sold out" : product.badge;

  return (
    <article className="group relative">
      <div className="media-frame aspect-portrait">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={soldOut ? "opacity-60" : undefined}
        />
        {badge && (
          <span className="absolute top-3 left-3 bg-background px-2 py-1 text-caption uppercase">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1 px-1 lg:mt-4">
        <p className="text-caption text-muted uppercase">{product.category.name}</p>
        <h3 className="text-body-s">
          {/* Stretched link: the whole card is clickable */}
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0"
          >
            {product.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-body-s">
          {formatPrice(product.price)}
          {status === "low-stock" && (
            <span className="text-caption text-muted uppercase">
              {getStockLabel(product.stock)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
