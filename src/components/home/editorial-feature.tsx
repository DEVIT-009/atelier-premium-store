import Image from "next/image";
import Link from "next/link";
import { eveningEdit } from "@/lib/sample-data";

// Image and copy side by side from lg; stacked on mobile
export function EditorialFeature() {
  return (
    <section
      aria-labelledby="evening-title"
      className="theme-inverse grid lg:grid-cols-2"
    >
      <div className="media-frame aspect-portrait lg:aspect-auto lg:min-h-192">
        <Image
          src={eveningEdit.image.src}
          alt={eveningEdit.image.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-[50%_20%]"
        />
      </div>

      <div className="flex flex-col items-start justify-center px-(--gutter) py-16 lg:px-20 xl:px-28">
        <p className="eyebrow text-muted">{eveningEdit.eyebrow}</p>
        <h2
          id="evening-title"
          className="mt-4 font-serif text-[3.5rem] leading-none lg:text-[6rem]"
        >
          {eveningEdit.title}
        </h2>
        <p className="mt-6 max-w-md text-lead">{eveningEdit.description}</p>
        <Link
          href={eveningEdit.cta.href}
          className="btn btn-secondary mt-10 w-full sm:w-auto"
        >
          {eveningEdit.cta.label}
        </Link>
      </div>
    </section>
  );
}
