// Static marketing content for the storefront. Products live in the database
// (see src/db/schema/catalog.ts).
// Images: Unsplash (free to use under the Unsplash License). All were checked
// to be free of third-party logos or branding.

export type ImageAsset = {
  src: string;
  alt: string;
};

export type Collection = {
  slug: string;
  title: string;
  href: string;
  image: ImageAsset;
};

export type Story = {
  eyebrow: string;
  title: string;
  href: string;
  image: ImageAsset;
};

function unsplash(id: string, width = 2000) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const navigation = [
  { label: "New In", href: "/new-in" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Bags", href: "/bags" },
  { label: "Shoes", href: "/shoes" },
  { label: "Jewelry", href: "/jewelry" },
] as const;

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "Quiet Form",
  description:
    "Tailored outerwear, soft structure and the colors of a city in early winter.",
  primary: { label: "Shop Women", href: "/women" },
  secondary: { label: "Shop Men", href: "/men" },
  images: [
    {
      src: unsplash("1539109136881-3be0616acf4b"),
      alt: "Woman in a pale blue wool coat and grey scarf in front of a gothic cathedral",
    },
    {
      src: unsplash("1485968579580-b6d095142e6e"),
      alt: "Woman in a dark green checked coat walking down a city street",
    },
  ],
};

export const collections: Collection[] = [
  {
    slug: "women",
    title: "Women",
    href: "/women",
    image: {
      src: unsplash("1581044777550-4cfa60707c03", 1200),
      alt: "Woman in a voluminous pink dotted dress in a golden field",
    },
  },
  {
    slug: "men",
    title: "Men",
    href: "/men",
    image: {
      src: unsplash("1617137968427-85924c800a22", 1200),
      alt: "Man in a navy suit with a white shirt and brown leather shoes",
    },
  },
  {
    slug: "shoes",
    title: "Shoes",
    href: "/shoes",
    image: {
      src: unsplash("1543163521-1bf539c55dd2", 1200),
      alt: "Pair of floral print stiletto pumps on a pale blue set",
    },
  },
  {
    slug: "jewelry",
    title: "Jewelry",
    href: "/jewelry",
    image: {
      src: unsplash("1535632066927-ab7c9ab60908", 1200),
      alt: "Sapphire and crystal drop earrings resting on a green leaf",
    },
  },
];

export const eveningEdit = {
  eyebrow: "The Evening Edit",
  title: "After Dark",
  description:
    "Sculpted silhouettes in jewel tones, finished with statement jewelry. Pieces made for the moment the lights go down.",
  cta: { label: "Discover the edit", href: "/women/evening" },
  image: {
    src: unsplash("1566174053879-31528523f8ae", 1600),
    alt: "Woman in an off-the-shoulder plum gown with chandelier earrings",
  },
};

// Sign in / sign up side image (same photo as the "Built to Last" story)
export const authFeature = {
  image: {
    src: unsplash("1490481651871-ab68de25d43d", 1600),
    alt: "Neutral toned blouses and knits on wooden hangers along a rail",
  },
};

export const tailoring = {
  eyebrow: "Men",
  title: "The Art of Tailoring",
  cta: { label: "Shop tailoring", href: "/men/tailoring" },
  image: {
    src: unsplash("1507679799987-c73779587ccf", 2400),
    alt: "Man buttoning a navy suit jacket over a striped tie",
  },
};

export const stories: Story[] = [
  {
    eyebrow: "Journal",
    title: "Linen, Light and the Long Summer",
    href: "/journal/linen-and-light",
    image: {
      src: unsplash("1496747611176-843222e1e57c", 1600),
      alt: "Floral print wrap dress moving in the wind by the sea",
    },
  },
  {
    eyebrow: "Inside the Atelier",
    title: "A Wardrobe Built to Last",
    href: "/journal/built-to-last",
    image: {
      src: unsplash("1490481651871-ab68de25d43d", 1600),
      alt: "Neutral toned blouses and knits on wooden hangers along a rail",
    },
  },
];

export const services = [
  {
    title: "Complimentary Shipping",
    description: "Free express delivery on every order.",
  },
  {
    title: "Easy Returns",
    description: "Return or exchange within 30 days.",
  },
  {
    title: "Gift Wrapping",
    description: "Every order arrives in signature packaging.",
  },
  {
    title: "Client Services",
    description: "Advisors available seven days a week.",
  },
];
