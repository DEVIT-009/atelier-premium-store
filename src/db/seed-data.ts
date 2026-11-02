// Initial catalogue loaded by `npm run db:seed`. Moved from src/lib/sample-data.ts.
// Images: Unsplash (free to use under the Unsplash License). All were checked
// to be free of third-party logos or branding.

export type SeedProduct = {
  slug: string;
  name: string;
  category: string; // category slug
  price: number; // USD cents
  stock: number;
  image: { src: string; alt: string };
  description: string;
  details: string[];
  badge?: string;
};

function unsplash(id: string, width = 2000) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const seedCategories = [
  { slug: "bags", name: "Bags" },
  { slug: "ready-to-wear", name: "Ready-to-Wear" },
  { slug: "jewelry", name: "Jewelry" },
  { slug: "accessories", name: "Accessories" },
  { slug: "shoes", name: "Shoes" },
  { slug: "watches", name: "Watches" },
];

// Product images are requested at 2000px so they stay sharp at detail-page size
export const seedProducts: SeedProduct[] = [
  {
    slug: "chevron-chain-shoulder-bag",
    name: "Chevron Chain Shoulder Bag",
    category: "bags",
    price: 145000,
    stock: 12,
    badge: "New",
    image: {
      src: unsplash("1566150905458-1bf1fc113f0d"),
      alt: "Pink leather shoulder bag with a yellow chevron stripe and silver chain",
    },
    description:
      "A compact shoulder bag in smooth blush calfskin, crossed by a hand-painted chevron in pale gold. The sliding chain strap can be worn long across the body or doubled on the shoulder.",
    details: [
      "Smooth calfskin leather",
      "Hand-painted chevron detail",
      "Palladium-finish sliding chain strap",
      "Magnetic flap closure",
      "Interior slip pocket",
      "W 22cm x H 14cm x D 6cm",
      "Made in Italy",
    ],
  },
  {
    slug: "cropped-leather-biker-jacket",
    name: "Cropped Leather Biker Jacket",
    category: "ready-to-wear",
    price: 320000,
    stock: 3,
    image: {
      src: unsplash("1551028719-00167b16eac5"),
      alt: "Black leather biker jacket laid flat on white linen",
    },
    description:
      "Cut from supple lambskin with a slightly cropped body, this biker jacket keeps the asymmetric zip and notched lapels of the original but softens the shoulder for an easier fit.",
    details: [
      "100% lambskin leather",
      "Viscose lining",
      "Asymmetric front zip",
      "Zipped cuffs and pockets",
      "Regular fit, cropped length",
      "Professional leather clean only",
      "Made in Italy",
    ],
  },
  {
    slug: "twisted-gold-hoop-earrings",
    name: "Twisted Gold Hoop Earrings",
    category: "jewelry",
    price: 62000,
    stock: 0,
    badge: "New",
    image: {
      src: unsplash("1617038220319-276d3cfab638"),
      alt: "Pair of twisted gold hoop earrings beside a white pebble in sunlight",
    },
    description:
      "Rope-twisted hoops in 18k gold vermeil, weighty enough to catch the light from across a room yet light enough to wear from morning into evening.",
    details: [
      "18k gold vermeil on sterling silver",
      "Hinged snap closure",
      "Diameter 2.5cm",
      "Sold as a pair",
      "Avoid contact with water and perfume",
    ],
  },
  {
    slug: "top-handle-satchel",
    name: "Top Handle Satchel",
    category: "bags",
    price: 189000,
    stock: 7,
    image: {
      src: unsplash("1594223274512-ad4803739b7c"),
      alt: "Teal pebbled leather satchel with a gold clasp beside a notebook",
    },
    description:
      "A structured satchel in deep teal pebbled leather with a sculpted top handle and a polished push-lock clasp. A detachable strap converts it for crossbody wear.",
    details: [
      "Pebbled calfskin leather",
      "Gold-finish push-lock clasp",
      "Detachable, adjustable shoulder strap",
      "Two interior compartments",
      "W 26cm x H 20cm x D 11cm",
      "Made in Italy",
    ],
  },
  {
    slug: "technical-bomber-jacket",
    name: "Technical Bomber Jacket",
    category: "ready-to-wear",
    price: 165000,
    stock: 9,
    image: {
      src: unsplash("1591047139829-d91aecb6caea"),
      alt: "Rust colored zip-up bomber jacket on a hanger",
    },
    description:
      "A lightweight bomber in rust technical twill with a soft sheen. Ribbed trims, a utility sleeve pocket and a clean two-way zip keep it close to the classic flight jacket.",
    details: [
      "Water-repellent technical twill",
      "Ribbed collar, cuffs and hem",
      "Two-way front zip",
      "Utility sleeve pocket",
      "Relaxed fit",
      "Machine wash cold",
    ],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round Metal Sunglasses",
    category: "accessories",
    price: 48000,
    stock: 2,
    image: {
      src: unsplash("1511499767150-a48a237f0083"),
      alt: "Round rose gold sunglasses with green lenses on white marble",
    },
    description:
      "Fine round frames in brushed rose gold with bottle-green lenses. A keyhole bridge and adjustable nose pads give a precise, comfortable fit.",
    details: [
      "Rose gold-finish metal frame",
      "Green mineral glass lenses",
      "100% UVA/UVB protection",
      "Adjustable nose pads",
      "Includes leather case and cloth",
    ],
  },
  {
    slug: "colorblock-runner-sneaker",
    name: "Colorblock Runner Sneaker",
    category: "shoes",
    price: 98000,
    stock: 15,
    badge: "New",
    image: {
      src: unsplash("1560769629-975ec94e6a86"),
      alt: "Pair of multicolor sneakers with red laces on a white plinth",
    },
    description:
      "A layered runner built from suede, leather and mesh panels in mint, saffron and plum, set on a sculpted cushioned sole and finished with contrast red laces.",
    details: [
      "Suede, leather and technical mesh upper",
      "Leather lining",
      "Cushioned rubber sole",
      "Contrast laces included",
      "Fits true to size",
    ],
  },
  {
    slug: "minimal-leather-strap-watch",
    name: "Minimal Leather Strap Watch",
    category: "watches",
    price: 115000,
    stock: 5,
    image: {
      src: unsplash("1524592094714-0f0654e20314"),
      alt: "Watch with a white dial, rose gold case and taupe leather strap held in hand",
    },
    description:
      "A slim dress watch with a clean white dial, rose gold-tone case and baton indices, worn on a soft taupe suede strap that can be changed without tools.",
    details: [
      "36mm stainless steel case, rose gold-tone",
      "Swiss quartz movement",
      "Sapphire crystal",
      "Water resistant to 30m",
      "Quick-release suede strap",
      "Two-year warranty",
    ],
  },
];
