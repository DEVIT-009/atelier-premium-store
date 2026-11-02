import { services } from "@/lib/sample-data";

export function Services() {
  return (
    <section aria-label="Our services" className="bg-surface">
      <ul className="page grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        {services.map((service) => (
          <li key={service.title} className="text-center">
            <h2 className="eyebrow">{service.title}</h2>
            <p className="mt-2 text-body-s text-muted">{service.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
