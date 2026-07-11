"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type HoldingRow = { id: string; symbol: string; asset_type: string; quantity: number; avg_price: number };
type PriceMap = Record<string, { price: number | null; change: number | null }>;

export default function SharedPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const supabase = createClient();

    supabase
      .from("portfolio_shares")
      .select("user_id")
      .eq("share_token", token)
      .single()
      .then(async ({ data: share, error: shareErr }) => {
        if (shareErr || !share) {
          setError("Portfolio not found or has been unshared.");
          setLoading(false);
          return;
        }

        const { data: holdingsData } = await supabase
          .from("portfolio_holdings")
          .select("id, symbol, asset_type, quantity, avg_price")
          .eq("user_id", share.user_id);

        const items = (holdingsData ?? []) as HoldingRow[];
        setHoldings(items);

        const map: PriceMap = {};
        for (const h of items) {
          try {
            let endpoint = "";
            if (h.asset_type === "crypto") endpoint = `/api/crypto?symbol=${h.symbol}`;
            else if (h.asset_type === "stock") endpoint = `/api/stocks?symbol=${h.symbol}`;
            else if (h.asset_type === "forex") endpoint = `/api/forex?pair=${h.symbol}`;
            else endpoint = `/api/commodities?symbol=${h.symbol}`;

            const res = await fetch(endpoint);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              map[h.symbol] = {
                price: data[0].price ?? data[0].current_price ?? null,
                change: data[0].changePercent ?? data[0].price_change_percentage_24h ?? null,
              };
            }
          } catch {}
        }
        setPrices(map);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <div className="text-center text-xs text-[#5d6b82] py-12">Loading shared portfolio…</div>;
  }

  if (error) {
    return <div className="text-center text-xs text-[#5d6b82] py-12">{error}</div>;
  }

  const totalValue = holdings.reduce((sum, h) => {
    const p = prices[h.symbol]?.price ?? 0;
    return sum + p * h.quantity;
  }, 0);

  const totalCost = holdings.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#d1d4dc]">Portfolio</h1>
        <p className="mt-1 text-xs text-[#5d6b82]">Shared portfolio snapshot</p>
        <div className="mt-3 flex items-center gap-6">
          <div>
            <span className="text-xs text-[#5d6b82]">Value</span>
            <p className="font-mono text-lg text-[#d1d4dc]">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <span className="text-xs text-[#5d6b82]">P&L</span>
            <p className={`font-mono text-lg ${totalPnl >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({totalPnlPct.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#1e2a3a]/50 bg-[#111520]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1e2a3a]/50 text-xs text-[#5d6b82]">
              <th className="px-4 py-2 font-medium">Symbol</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Avg Price</th>
              <th className="px-4 py-2 text-right font-medium">Current</th>
              <th className="px-4 py-2 text-right font-medium">Change</th>
              <th className="px-4 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const p = prices[h.symbol];
              const currentPrice = p?.price ?? 0;
              const change = p?.change ?? null;
              const up = change !== null ? change >= 0 : true;
              const value = currentPrice * h.quantity;
              const pnl = (currentPrice - h.avg_price) * h.quantity;
              const pnlPct = h.avg_price > 0 ? ((currentPrice - h.avg_price) / h.avg_price) * 100 : 0;
              return (
                <tr key={h.id} className="border-b border-[#1e2a3a]/30 transition-colors hover:bg-[#1e2a3a]/30">
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs font-medium text-[#d1d4dc]">{h.symbol}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-[#5d6b82]">{h.asset_type}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#d1d4dc]">{h.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#d1d4dc]">${h.avg_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#d1d4dc]">
                    {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-xs ${up ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    {change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-xs ${pnl >= 0 ? "text-[#00c853]" : "text-[#ff1744]"}`}>
                    ${value.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[#5d6b82]">This portfolio is empty.</div>
        )}
      </div>
    </div>
  );
}
