import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { authFeature } from "@/lib/sample-data";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

// Sign in / sign up frame: image and form side by side from lg (like the
// homepage editorial feature); form only on mobile
export function AuthShell({ id, eyebrow, title, description, children }: Props) {
  return (
    <section aria-labelledby={id} className="grid lg:grid-cols-2">
      <div className="media-frame hidden lg:block lg:min-h-192">
        <Image
          src={authFeature.image.src}
          alt={authFeature.image.alt}
          fill
          preload
          sizes="50vw"
        />
      </div>

      <div className="flex flex-col px-(--gutter) pt-6 pb-(--section-y) lg:justify-center lg:px-20 lg:py-16 xl:px-28">
        <nav aria-label="Breadcrumb" className="lg:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-caption text-muted uppercase">
            <li>
              <Link href="/" className="link-quiet">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {title}
            </li>
          </ol>
        </nav>

        <div className="mt-8 w-full max-w-md lg:mt-0">
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 id={id} className="mt-2 text-title-xl">
            {title}
          </h1>
          <p className="mt-3 text-body-s text-muted">{description}</p>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  );
}

// Same height as the form so the column doesn't jump when it hydrates
export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-busy="true" aria-label="Loading form" className="flex flex-col gap-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <div className="mb-2 h-3.5 w-20 bg-surface" />
          <div className="h-12 bg-surface" />
        </div>
      ))}
      <div className="mt-3 h-14 bg-surface" />
    </div>
  );
}
