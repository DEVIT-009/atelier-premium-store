import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/home/section-heading";
import { collections } from "@/lib/sample-data";

export function CollectionGrid() {
  return (
    <section aria-labelledby="collections-title" className="page section">
      <SectionHeading
        id="collections-title"
        eyebrow="Explore"
        title="Shop by Category"
      />

      <ul className="grid grid-cols-2 gap-x-1 gap-y-8 lg:grid-cols-4">
        {collections.map((collection) => (
          <li key={collection.slug} className="group relative">
            <div className="media-frame aspect-tall">
              <Image
                src={collection.image.src}
                alt={collection.image.alt}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            </div>
            <div className="mt-4 flex items-center justify-between px-1">
              <h3 className="text-title-s">
                <Link
                  href={collection.href}
                  className="after:absolute after:inset-0"
                >
                  {collection.title}
                </Link>
              </h3>
              <span className="nav-link link hidden sm:inline" aria-hidden="true">
                Shop now
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
