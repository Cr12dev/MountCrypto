"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AssetRow = { symbol: string; asset_type: string; position: number };
type AssetPrice = { symbol: string; price: number | null; change: number | null };
type PriceMap = Record<string, { price: number | null; change: number | null }>;

export default function SharedWatchlistPage() {
  const { token } = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const supabase = createClient();

    supabase
      .from("watchlists")
      .select("id, name")
      .eq("share_token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }
        setName(data.name);

        supabase
          .from("watchlist_assets")
          .select("symbol, asset_type, position")
          .eq("watchlist_id", data.id)
          .order("position", { ascending: true })
          .then(async ({ data: assetsData }) => {
            const items = (assetsData ?? []) as AssetRow[];
            setAssets(items);

            const map: PriceMap = {};
            for (const a of items) {
              try {
                let endpoint = "";
                if (a.asset_type === "crypto") endpoint = `/api/crypto?symbol=${a.symbol}`;
                else if (a.asset_type === "stock") endpoint = `/api/stocks?symbol=${a.symbol}`;
                else if (a.asset_type === "forex") endpoint = `/api/forex?pair=${a.symbol}`;
                else endpoint = `/api/commodities?symbol=${a.symbol}`;

                const res = await fetch(endpoint);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                  map[a.symbol] = {
                    price: data[0].price ?? data[0].current_price ?? null,
                    change: data[0].changePercent ?? data[0].price_change_percentage_24h ?? null,
                  };
                }
              } catch {}
            }
            setPrices(map);
            setLoading(false);
          });
      });
  }, [token]);

  if (loading) {
    return <div className="text-center text-xs text-[#5d6b82] py-12">Loading shared watchlist…</div>;
  }

  if (!name) {
    return <div className="text-center text-xs text-[#5d6b82] py-12">Watchlist not found or has been unshared.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#d1d4dc]">{name}</h1>
        <p className="mt-1 text-xs text-[#5d6b82]">Shared watchlist</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#1e2a3a]/50 bg-[#111520]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1e2a3a]/50 text-xs text-[#5d6b82]">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Symbol</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => {
              const p = prices[a.symbol];
              const change = p?.change ?? null;
              const up = change !== null ? change >= 0 : true;
              return (
                <tr key={a.symbol} className="border-b border-[#1e2a3a]/30 transition-colors hover:bg-[#1e2a3a]/30">
                  <td className="px-4 py-2 font-mono text-xs text-[#5d6b82]">{i + 1}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs font-medium text-[#d1d4dc]">{a.symbol}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-[#5d6b82]">{a.asset_type}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#d1d4dc]">
                    {p?.price !== null && p?.price !== undefined ? `$${p.price.toFixed(2)}` : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-xs ${up ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {assets.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[#5d6b82]">This watchlist is empty.</div>
        )}
      </div>
    </div>
  );
}
