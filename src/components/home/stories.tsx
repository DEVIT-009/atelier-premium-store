import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/home/section-heading";
import { stories, type Story } from "@/lib/sample-data";

export function Stories() {
  return (
    <section aria-labelledby="stories-title" className="page section">
      <SectionHeading
        id="stories-title"
        eyebrow="Journal"
        title="Stories from the House"
        action={{ label: "Read more", href: "/journal" }}
      />

      <ul className="grid gap-x-1 gap-y-10 md:grid-cols-2">
        {stories.map((story) => (
          <li key={story.href}>
            <StoryCard story={story} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StoryCard({ story }: { story: Story }) {
  return (
    <div className="group relative">
      <div className="media-frame aspect-[3/2]">
        <Image
          src={story.image.src}
          alt={story.image.alt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
      <div className="mt-5 px-1">
        <p className="eyebrow text-muted">{story.eyebrow}</p>
        <h3 className="mt-2 text-title-m">
          <Link href={story.href} className="after:absolute after:inset-0">
            {story.title}
          </Link>
        </h3>
      </div>
    </div>
  );
}
