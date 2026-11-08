import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryCard } from "@/components/home/stories";
import { SectionHeading } from "@/components/home/section-heading";
import { stories } from "@/lib/sample-data";

function getStory(slug: string) {
  return stories.find((story) => story.slug === slug);
}

// Stories are static data, so nothing here needs a Suspense placeholder. Reading
// params before streaming lets an unknown slug return a 404 status where it can.
export const instant = false;

// Prerender every story; unknown slugs fall through to notFound()
export function generateStaticParams() {
  return stories.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};

  return {
    title: story.title,
    description: story.description,
    openGraph: {
      title: story.title,
      description: story.description,
      images: [{ url: story.image.src, alt: story.image.alt }],
    },
  };
}

export default async function StoryPage({
  params,
}: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const others = stories.filter((other) => other.slug !== story.slug);

  return (
    <>
      <article>
        {/* Image and title side by side from lg; stacked on mobile */}
        <header className="grid lg:grid-cols-2">
          <div className="media-frame aspect-portrait lg:aspect-auto lg:min-h-192">
            <Image
              src={story.image.src}
              alt={story.image.alt}
              fill
              preload
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="flex flex-col items-start justify-center px-(--gutter) py-12 lg:px-20 lg:py-16 xl:px-28">
            <p className="eyebrow text-muted">{story.eyebrow}</p>
            <h1 className="mt-4 font-serif text-[3.5rem] leading-none lg:text-[6rem]">
              {story.title}
            </h1>
            <p className="mt-6 max-w-md text-lead">{story.description}</p>
          </div>
        </header>

        <div className="section mx-auto flex max-w-narrow flex-col gap-6 px-(--gutter) text-lead">
          {story.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <Link
            href={story.cta.href}
            className="btn btn-primary mt-4 w-full sm:w-auto sm:self-start"
          >
            {story.cta.label}
          </Link>
        </div>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="more-stories-title" className="page section hairline">
          <SectionHeading
            id="more-stories-title"
            eyebrow="Journal"
            title="More from the House"
          />
          <ul className="grid gap-x-1 gap-y-10 md:grid-cols-2">
            {others.map((other) => (
              <li key={other.href}>
                <StoryCard story={other} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
