import Link from "next/link";

const footerLinks = [
  { href: "#about", label: "About" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#demo", label: "Demo" },
];

export function Footer() {
  return (
    <footer className="px-4 py-12 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <Link href="/" className="text-sm font-bold tracking-[0.15em] text-text-primary">
            MOUNTCRYPTO
          </Link>
          <p className="mt-1 text-xs text-text-secondary">
            Markets at a glance.
          </p>
        </div>
        <div className="flex items-center gap-6">
          {footerLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-xs text-text-secondary transition-colors hover:text-text-primary">
              {l.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} MountCrypto. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
