import type { ReactNode } from "react";
import Link from "next/link";

export default function SharedLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#080b12", color: "#d1d4dc", minHeight: "100vh" }}>
      <header className="flex items-center justify-between border-b border-[#1e2a3a]/50 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#d1d4dc] no-underline">
          <span className="text-[#448aff]">MC</span>
          <span>MountCrypto</span>
        </Link>
        <span className="text-xs text-[#5d6b82]">Shared view</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
