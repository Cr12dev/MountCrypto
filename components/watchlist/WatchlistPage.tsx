"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createWatchlist, renameWatchlist, deleteWatchlist, addAsset, removeAsset } from "@/lib/actions/watchlist";
import type { ChangeMap } from "@/lib/api/timeframes";

type AssetType = "stock" | "crypto" | "forex" | "commodity";

type Watchlist = {
  id: string;
  name: string;
  created_at: string;
  assets: {
    id: string;
    symbol: string;
    asset_type: AssetType;
    added_at: string;
  }[];
};

type PriceMap = Record<string, { price: number; change: number; changePercent: number; changes: ChangeMap }>;

const assetLabels: Record<AssetType, string> = {
  stock: "Stock",
  crypto: "Crypto",
  forex: "Forex",
  commodity: "Commodity",
};

function fmtPrice(n: number, type: AssetType) {
  if (type === "crypto") {
    if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  if (n >= 100) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function WatchlistPage({ userId }: { userId: string }) {
  const supabase = createClient();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<PriceMap>({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addSymbol, setAddSymbol] = useState("");
  const [addType, setAddType] = useState<AssetType>("stock");

  const fetchWatchlists = useCallback(async () => {
    const { data, error } = await supabase
      .from("watchlists")
      .select("*, assets:watchlist_assets(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!error && data) setWatchlists(data as unknown as Watchlist[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  useEffect(() => {
    if (!watchlists.length) return;

    const symbols = new Set<string>();
    watchlists.forEach((wl) => wl.assets.forEach((a) => symbols.add(`${a.asset_type}:${a.symbol}`)));
    if (!symbols.size) return;

    Promise.all([
      fetch("/api/stocks?type=stocks").then((r) => r.json()).catch(() => []),
      fetch("/api/crypto?per_page=50").then((r) => r.json()).catch(() => []),
      fetch("/api/forex").then((r) => r.json()).catch(() => []),
      fetch("/api/commodities").then((r) => r.json()).catch(() => []),
    ]).then(([stocks, crypto, forex, commodities]) => {
      const map: PriceMap = {};
      for (const s of stocks) map[`stock:${s.symbol}`] = { price: s.price, change: s.change, changePercent: s.changePercent, changes: s.changes ?? {} };
      for (const c of crypto) map[`crypto:${c.symbol.toUpperCase()}`] = { price: c.current_price, change: 0, changePercent: c.price_change_percentage_24h ?? 0, changes: { "1h": c.price_change_percentage_1h_in_currency, "1d": c.price_change_percentage_24h, "7d": c.price_change_percentage_7d_in_currency, "28d": c.price_change_percentage_30d_in_currency, "1y": c.price_change_percentage_1y_in_currency } };
      for (const f of forex) map[`forex:${f.pair}`] = { price: (f.bid + f.ask) / 2, change: f.change, changePercent: f.changePercent, changes: f.changes ?? {} };
      for (const c of commodities) map[`commodity:${c.symbol}`] = { price: c.price, change: c.change, changePercent: c.changePercent, changes: c.changes ?? {} };
      setPrices(map);
    });
  }, [watchlists]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createWatchlist(newName.trim());
      setNewName("");
      await fetchWatchlists();
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    try {
      await renameWatchlist(id, renameValue.trim());
      setRenaming(null);
      await fetchWatchlists();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWatchlist(id);
      await fetchWatchlists();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddAsset(watchlistId: string) {
    if (!addSymbol.trim()) return;
    try {
      await addAsset(watchlistId, addSymbol.trim(), addType);
      setAddSymbol("");
      setAddingTo(null);
      await fetchWatchlists();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRemoveAsset(assetId: string) {
    try {
      await removeAsset(assetId);
      await fetchWatchlists();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <p className="text-xs text-text-secondary leading-relaxed">
          Track your favorite assets across all markets. Create custom lists to monitor
          stocks, crypto, forex, and commodities at a glance.
        </p>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="title-sm">Watchlist</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
          >
            + New list
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Watchlist name"
            className="w-48 rounded border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            Create
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
          className="text-xs text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-secondary">Loading watchlists…</p>
      ) : watchlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm font-medium text-text-secondary">No watchlists yet</p>
          <p className="mt-1 text-xs text-text-secondary">Create your first list to start tracking assets</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {watchlists.map((wl) => (
            <div key={wl.id} className="rounded-lg border border-border bg-bg-card/30">
              <div className="flex items-center justify-between border-b border-border/30 px-3 py-2">
                {renaming === wl.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-40 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-accent"
                      onKeyDown={(e) => e.key === "Enter" && handleRename(wl.id)}
                      autoFocus
                    />
                    <button onClick={() => handleRename(wl.id)} className="text-xs text-accent">Save</button>
                    <button onClick={() => setRenaming(null)} className="text-xs text-text-secondary">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRenaming(wl.id); setRenameValue(wl.name); }}
                    className="text-xs font-medium text-text-primary hover:text-accent"
                  >
                    {wl.name}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(wl.id)}
                  className="text-xs text-text-secondary transition-colors hover:text-red"
                >
                  Delete
                </button>
              </div>

              {wl.assets.length === 0 ? (
                <p className="px-3 py-4 text-xs text-text-secondary">No assets yet</p>
              ) : (
                <div>
                  {wl.assets.map((asset) => {
                    const key = `${asset.asset_type}:${asset.symbol}`;
                    const quote = prices[key];
                    const up = quote ? quote.changePercent >= 0 : true;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between border-b border-border/20 px-3 py-1.5 last:border-0 hover:bg-bg-hover/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-secondary">{assetLabels[asset.asset_type]}</span>
                          <span className="font-mono text-xs font-medium text-text-primary">{asset.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {quote ? (
                            <>
                              <span className="font-mono text-xs text-text-primary">${fmtPrice(quote.price, asset.asset_type)}</span>
                              <span className={`w-14 text-right font-mono text-xs ${up ? "text-green" : "text-red"}`}>
                                {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                              </span>
                            </>
                          ) : (
                            <span className="font-mono text-xs text-text-secondary">—</span>
                          )}
                          <button
                            onClick={() => handleRemoveAsset(asset.id)}
                            className="text-xs text-text-secondary transition-colors hover:text-red"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-border/20 px-3 py-1.5">
                {addingTo === wl.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value as AssetType)}
                      className="rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-accent"
                    >
                      <option value="stock">Stock</option>
                      <option value="crypto">Crypto</option>
                      <option value="forex">Forex</option>
                      <option value="commodity">Commodity</option>
                    </select>
                    <input
                      value={addSymbol}
                      onChange={(e) => setAddSymbol(e.target.value)}
                      placeholder="Symbol"
                      className="w-28 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                      onKeyDown={(e) => e.key === "Enter" && handleAddAsset(wl.id)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddAsset(wl.id)}
                      disabled={!addSymbol.trim()}
                      className="text-xs text-accent transition-colors hover:text-text-primary disabled:opacity-30"
                    >
                      Add
                    </button>
                    <button onClick={() => { setAddingTo(null); setAddSymbol(""); }} className="text-xs text-text-secondary">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(wl.id)}
                    className="text-xs text-text-secondary transition-colors hover:text-text-primary"
                  >
                    + Add asset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
