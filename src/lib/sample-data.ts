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
  slug: string;
  eyebrow: string;
  title: string;
  href: string;
  image: ImageAsset;
  description: string;
  body: string[];
  cta: { label: string; href: string };
};

function unsplash(id: string, width = 2000) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

// The menu's fixed links; the categories staff choose follow them
// (getStoreCategories in src/lib/products.ts)
export const navigation = [
  { label: "New In", href: "/new-in" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
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

// The homepage's fixed department tiles; the categories staff choose follow them
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
    slug: "linen-and-light",
    eyebrow: "Journal",
    title: "Linen, Light and the Long Summer",
    href: "/journal/linen-and-light",
    image: {
      src: unsplash("1496747611176-843222e1e57c", 1600),
      alt: "Floral print wrap dress moving in the wind by the sea",
    },
    description:
      "How to dress for the slow, bright days, when the best clothes are the ones you forget you are wearing.",
    body: [
      "There is a point in every summer when the heat stops being an event and becomes the weather you live in. Mornings start earlier, evenings run later, and the wardrobe gets smaller without anyone deciding that it should.",
      "This is the season for cloth that moves. Linen creases and softens, and it looks better for both. A dress cut with room in it catches whatever breeze there is, and a loose shirt carries you from the first coffee to the last walk home.",
      "Keep the palette close to what the light is already doing: chalk, sand, faded blue, and one print you love enough to wear twice in a week. Then let the details stay simple, with a flat shoe, a small earring and a bag that holds only what the day needs.",
      "The long summer asks for very little. Choose a few pieces that feel easy, wear them often, and leave the rest of the rail for the cooler months.",
    ],
    cta: { label: "Shop women", href: "/women" },
  },
  {
    slug: "built-to-last",
    eyebrow: "Inside the Atelier",
    title: "A Wardrobe Built to Last",
    href: "/journal/built-to-last",
    image: {
      src: unsplash("1490481651871-ab68de25d43d", 1600),
      alt: "Neutral toned blouses and knits on wooden hangers along a rail",
    },
    description:
      "Fewer pieces, chosen slowly and looked after well. A few thoughts on keeping clothes for years rather than seasons.",
    body: [
      "A lasting wardrobe rarely begins with a shopping list. It begins with a look at the rail: the things you reach for without thinking, and the things that have hung untouched since the day they arrived.",
      "The pieces worth keeping tend to share a few qualities. The shape is clear enough to outlive a trend, the cloth wears in rather than out, and the color sits easily beside everything else you own. A good knit or a well-cut blouse should work on a Monday and still feel right on a Saturday.",
      "Care is the other half of it. Rest a garment between wears, fold knits instead of hanging them, and mend a loose button before it goes missing. Small habits like these are what turn a purchase into something you keep.",
      "When you do add something new, ask whether you can see yourself wearing it in five years. If the answer comes easily, it probably belongs.",
    ],
    cta: { label: "Shop new in", href: "/new-in" },
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
