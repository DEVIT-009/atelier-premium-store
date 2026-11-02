import { SectionHeading } from "@/components/home/section-heading";
import { ProductCard } from "@/components/product/product-card";
import { getProducts } from "@/lib/products";

export async function NewArrivals() {
  const products = await getProducts({ limit: 8 });

  return (
    <section aria-labelledby="new-in-title" className="page section">
      <SectionHeading
        id="new-in-title"
        eyebrow="This Season"
        title="New In"
        action={{ label: "View all", href: "/new-in" }}
      />

      <div className="grid-products">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
