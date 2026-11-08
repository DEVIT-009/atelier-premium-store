import { notFound } from "next/navigation";

// URLs with several segments match no store route, and without this they'd get
// the root 404 with no store header or footer. Single segments reach [category].
export const instant = false;

export default function MissingPage() {
  notFound();
}
