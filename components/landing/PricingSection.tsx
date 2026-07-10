import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Get started with delayed market data and basic watchlists.",
    features: ["Delayed quotes", "3 watchlists", "Basic portfolio", "Community access"],
    cta: "Create free account",
    href: "/register",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    desc: "Real-time data, unlimited watchlists, and advanced analytics.",
    features: ["Real-time quotes", "Unlimited watchlists", "Advanced portfolio", "Price alerts", "API access"],
    cta: "Start free trial",
    href: "/register",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored pricing",
    desc: "Dedicated infrastructure, custom integrations, and priority support.",
    features: ["All Pro features", "Custom integrations", "Dedicated support", "SLA guarantee", "Team management"],
    cta: "Contact sales",
    href: "#demo",
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" data-gsap="section-reveal" className="border-b border-border/20 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p data-gsap="label" className="text-center text-xs font-medium tracking-[0.15em] text-text-secondary">Pricing</p>
        <h2 data-gsap="title" className="mt-3 text-center font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.02em] text-text-primary">
          One plan fits most. Another fits the rest.
        </h2>
        <div data-gsap="card-stagger" className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-lg border p-6 ${
                p.featured
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-bg-card/30"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-2.5 left-4 rounded bg-accent px-2 py-0.5 font-mono text-xs font-medium text-white">
                  POPULAR
                </span>
              )}
              <p className="text-xs font-medium tracking-[0.08em] text-text-secondary">{p.name}</p>
              <p className="mt-3 font-display text-[2rem] font-semibold text-text-primary">{p.price}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{p.period}</p>
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">{p.desc}</p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-primary">
                    <span className="text-green">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href={p.href}
                  className={`block w-full rounded px-4 py-2 text-center text-xs font-medium transition-all ${
                    p.featured
                      ? "bg-accent text-white hover:opacity-90"
                      : "border border-border text-text-secondary hover:border-text-secondary hover:text-text-primary"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
