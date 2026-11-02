import Link from "next/link";

type Props = {
  id: string;
  eyebrow?: string;
  title: string;
  action?: { label: string; href: string };
};

export function SectionHeading({ id, eyebrow, title, action }: Props) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 lg:mb-12">
      <div>
        {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
        <h2 id={id} className="mt-2 text-title-l">
          {title}
        </h2>
      </div>
      {action && (
        <Link href={action.href} className="nav-link link shrink-0">
          {action.label}
        </Link>
      )}
    </div>
  );
}
