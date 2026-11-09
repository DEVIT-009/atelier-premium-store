import type { SVGProps } from "react";

// 24px line icons, 1.25 stroke, inherit currentColor
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </Icon>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </Icon>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Icon>
  );
}

export function BagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 8h16l-1 13H5L4 8z" />
      <path d="M8.5 8V6.5a3.5 3.5 0 017 0V8" />
    </Icon>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon width={16} height={16} {...props}>
      <path d="M12 4v16M4 12h16" />
    </Icon>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon width={16} height={16} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Icon>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon width={16} height={16} {...props}>
      <path d="M9 9h11v11H9z" />
      <path d="M5 15H4V4h11v1" />
    </Icon>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon width={16} height={16} {...props}>
      <path d="M4 12.5l5.5 5.5L20 6.5" />
    </Icon>
  );
}
