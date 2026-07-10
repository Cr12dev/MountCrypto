import Link from "next/link";

export function DemoSection() {
  return (
    <section id="demo" className="border-b border-border/20 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p data-gsap="label" className="text-xs font-medium tracking-[0.15em] text-text-secondary">Demo</p>
        <h2 data-gsap="title" className="mt-3 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.02em] text-text-primary">
          See it in action.
        </h2>
        <p data-gsap="title" className="mt-3 text-xs leading-relaxed text-text-secondary">
          Create a free account and explore the full dashboard — live indices, crypto charts, forex spreads, and commodity prices. No credit card required.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded bg-accent px-5 py-2.5 text-xs font-medium text-white transition-all hover:bg-accent/90"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="rounded border border-border px-5 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
