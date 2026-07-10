"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/markets", label: "Markets" },
  { href: "/dashboard/crypto", label: "Crypto" },
  { href: "/dashboard/forex", label: "Forex" },
  { href: "/dashboard/commodities", label: "Commodities" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-bg-surface">
      <Link href="/dashboard" className="group flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="font-display text-white text-sm font-semibold tracking-[0.15em] text-transparent">
          MOUNTCRYPTO
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-display relative flex items-center gap-3 rounded px-3 py-2 text-xs font-medium tracking-[0.08em] transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full before:bg-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-2.5">
        <p className="font-display text-xs font-medium tracking-[0.08em] text-text-secondary">v1.0 · 4 markets</p>
      </div>
    </aside>
  );
}
