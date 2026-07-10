"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "#about", label: "About" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#demo", label: "Demo" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/20 bg-bg-primary/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-[0.15em] text-text-primary">
          MOUNTCRYPTO
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs font-medium tracking-[0.08em] text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 md:hidden">
          <span className="text-xs text-text-secondary">Menu</span>
        </button>
      </div>
      {open && (
        <div className="border-t border-border/20 px-4 py-3 md:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block py-1.5 text-xs text-text-secondary"
            >
              {l.label}
            </a>
          ))}
          <hr className="my-2 border-border/20" />
          <Link href="/login" className="block py-1.5 text-xs text-text-secondary">Sign in</Link>
          <Link href="/register" className="block py-1.5 text-xs text-accent">Get started</Link>
        </div>
      )}
    </nav>
  );
}
