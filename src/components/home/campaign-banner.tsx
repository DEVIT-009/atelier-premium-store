import Image from "next/image";
import Link from "next/link";
import { tailoring } from "@/lib/sample-data";

// Full-bleed landscape image with centered copy
export function CampaignBanner() {
  return (
    <section
      aria-labelledby="tailoring-title"
      className="relative aspect-tall overflow-hidden bg-media sm:aspect-wide"
    >
      <Image
        src={tailoring.image.src}
        alt={tailoring.image.alt}
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="page absolute inset-0 flex flex-col items-center justify-center text-center text-white">
        <p className="eyebrow">{tailoring.eyebrow}</p>
        <h2 id="tailoring-title" className="mt-3 text-title-xl">
          {tailoring.title}
        </h2>
        <Link href={tailoring.cta.href} className="btn btn-glass mt-8">
          {tailoring.cta.label}
        </Link>
      </div>
    </section>
  );
}
