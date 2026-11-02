import Image from "next/image";
import Link from "next/link";
import { hero } from "@/lib/sample-data";

// Full-height campaign: one image on mobile, a diptych from lg
export function Hero() {
  const [first, second] = hero.images;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative h-[calc(100svh-var(--header-height)-2rem)] min-h-[32rem] overflow-hidden bg-media"
    >
      <div className="grid h-full lg:grid-cols-2">
        <div className="relative">
          <Image
            src={first.src}
            alt={first.alt}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[50%_30%]"
          />
        </div>
        <div className="relative hidden lg:block">
          <Image
            src={second.src}
            alt={second.alt}
            fill
            preload
            sizes="50vw"
            className="object-cover object-[50%_30%]"
          />
        </div>
      </div>

      {/* Scrim keeps the white type legible over any image */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

      <div className="page absolute inset-x-0 bottom-0 flex flex-col items-center pb-10 text-center text-white lg:pb-16">
        <p className="eyebrow">{hero.eyebrow}</p>
        <h1 id="hero-title" className="mt-3 text-display uppercase">
          {hero.title}
        </h1>
        <p className="mt-4 max-w-md text-body-s lg:text-body">
          {hero.description}
        </p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={hero.primary.href} className="btn btn-glass sm:min-w-48">
            {hero.primary.label}
          </Link>
          <Link
            href={hero.secondary.href}
            className="btn btn-glass sm:min-w-48"
          >
            {hero.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
