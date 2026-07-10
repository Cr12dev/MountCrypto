const testimonials = [
  {
    quote: "I used to juggle four tabs to track my portfolio. Now it's all in one place. The crypto watchlist alone saves me 30 minutes a day.",
    author: "Alex Chen",
    role: "Independent trader",
  },
  {
    quote: "Clean, fast, and actually useful. No bloat, no spam — just the data I need. The dark theme is easy on the eyes during late sessions.",
    author: "Sarah K.",
    role: "Crypto investor",
  },
  {
    quote: "We migrated our team to MountCrypto for cross-asset tracking. The API integration with our existing tools was seamless.",
    author: "Marcus Johnson",
    role: "Fund analyst",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" data-gsap="section-reveal" className="border-b border-border/20 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p data-gsap="label" className="text-center text-xs font-medium tracking-[0.15em] text-text-secondary">Testimonials</p>
        <h2 data-gsap="title" className="mt-3 text-center font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.02em] text-text-primary">
          Trusted by traders worldwide.
        </h2>
        <div data-gsap="card-stagger" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.author} className="flex flex-col bg-bg-primary p-6 md:p-8">
              <p className="text-xs leading-relaxed text-text-primary">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4">
                <p className="text-xs font-medium text-text-primary">{t.author}</p>
                <p className="text-xs text-text-secondary">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
