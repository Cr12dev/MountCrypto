"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { useNews } from "@/components/news/NewsContext";

const supabase = createClient();

export function Navbar() {
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
    <header className="flex h-11 items-center gap-3 border-b border-border bg-bg-surface px-4">
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleNews}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
          News
        </button>
        <span className="mx-2 text-sm text-text-secondary">{email}</span>
        <button
          onClick={handleSignOut}
          className="rounded px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
