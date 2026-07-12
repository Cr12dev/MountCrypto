"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { useNews } from "@/components/news/NewsContext";

const supabase = createClient();

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const { isNewsOpen, toggleNews } = useNews();

  useEffect(() => {
    let ignore = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignore) setEmail(data.user?.email ?? null);
    });
    return () => { ignore = true; };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex h-11 items-center gap-3 border-b border-border bg-bg-surface px-2 sm:px-4">
      <button
        onClick={onMenuClick}
        className="flex shrink-0 items-center justify-center rounded p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary lg:hidden"
        title="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleNews}
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
            isNewsOpen
              ? "bg-accent/10 text-accent"
              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          }`}
          title={isNewsOpen ? "Close news" : "Open news"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-4 0V6" />
            <path d="M10 6h6" />
            <path d="M10 10h6" />
            <path d="M10 14h4" />
          </svg>
          <span className="hidden sm:inline">News</span>
        </button>
        <span className="mx-2 hidden text-sm text-text-secondary sm:inline">{email}</span>
        <button
          onClick={handleSignOut}
          className="rounded px-2 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <span className="hidden sm:inline">Sign out</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
