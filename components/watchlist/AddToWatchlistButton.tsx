"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { addAsset } from "@/lib/actions/watchlist";
import { useRouter } from "next/navigation";

export function AddToWatchlistButton({
  symbol,
  assetType,
}: {
  symbol: string;
  assetType: string;
}) {
  const [open, setOpen] = useState(false);
  const [watchlists, setWatchlists] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("watchlists")
      .select("id, name")
      .then(({ data }) => {
        if (data) setWatchlists(data);
      });
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleAdd(watchlistId: string) {
    setAdding(watchlistId);
    try {
      await addAsset(watchlistId, symbol, assetType);
      router.refresh();
      setOpen(false);
    } catch {
      // ignore duplicate
    }
    setAdding(null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
      >
        + Watchlist
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-bg-surface p-1 shadow-lg">
          {watchlists.length === 0 ? (
            <p className="px-2 py-2 text-xs text-text-secondary">No watchlists yet</p>
          ) : (
            watchlists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => handleAdd(wl.id)}
                disabled={adding === wl.id}
                className="flex w-full items-center rounded px-2 py-1.5 text-xs text-text-primary transition-colors hover:bg-bg-hover disabled:opacity-30"
              >
                <span className="mr-2 text-xs text-green">+</span>
                {wl.name}
              </button>
            ))
          )}
          <hr className="my-1 border-border/30" />
          <a
            href="/watchlist"
            className="flex w-full items-center rounded px-2 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            Manage watchlists
          </a>
        </div>
      )}
    </div>
  );
}
