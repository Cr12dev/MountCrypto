"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/ui/GlobalSearch";

export function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
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
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-text-secondary">{email}</span>
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
