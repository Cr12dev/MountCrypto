"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const quickLinks = [
  { label: "Markets", href: "/dashboard/markets" },
  { label: "Crypto", href: "/dashboard/crypto" },
  { label: "Forex", href: "/dashboard/forex" },
  { label: "Commodities", href: "/dashboard/commodities" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !open)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  const filteredQuick = quickLinks.filter(
    (l) => !query || l.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-border hover:text-text-primary"
      >
        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Search
        <span className="ml-auto rounded border border-border px-1.5 font-mono text-xs">/</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-bg-surface shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-text-secondary">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
              />
              <span className="font-mono text-xs text-text-secondary">ESC</span>
            </div>
            <div className="py-1">
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-text-secondary">
                Pages
              </p>
              {filteredQuick.map((l) => (
                <button
                  key={l.href}
                  onClick={() => handleSelect(l.href)}
                  className="flex w-full items-center px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover"
                >
                  {l.label}
                </button>
              ))}
              {filteredQuick.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-text-secondary">
                  No results
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
