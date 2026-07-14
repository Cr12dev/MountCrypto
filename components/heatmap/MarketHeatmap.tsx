"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { ScreenerItem } from "@/app/api/screener/route";

const STOCK_SECTORS: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  AMZN: "Consumer Cyclical",
  NVDA: "Technology",
  META: "Technology",
  TSLA: "Consumer Cyclical",
  JPM: "Financial",
  V: "Financial",
  IBM: "Technology",
};

function getSector(item: ScreenerItem): string {
  if (item.assetType === "crypto") return "Cryptocurrency";
  return STOCK_SECTORS[item.symbol] ?? "Other";
}

function getColor(change: number | null): string {
  if (change == null) return "#2a2e39";
  if (change > 10) return "#089981";
  if (change > 5) return "#0ea87f";
  if (change > 2) return "#26a69a";
  if (change > 0) return "#4caf86";
  if (change === 0) return "#2a2e39";
  if (change > -2) return "#d9534f";
  if (change > -5) return "#f23645";
  if (change > -10) return "#e53935";
  return "#b71c1c";
}

function getTextColor(change: number | null): string {
  if (change == null) return "#787b86";
  return "#d1d4dc";
}

export function MarketHeatmap() {
  const [all, setAll] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"change24h" | "change7d" | "volume">("change24h");

  useEffect(() => {
    setLoading(true);
    fetch("/api/screener")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAll(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const map = new Map<string, ScreenerItem[]>();
    for (const item of all) {
      const sector = getSector(item);
      if (!map.has(sector)) map.set(sector, []);
      map.get(sector)!.push(item);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({
        name,
        items,
        avgChange: items.reduce((s, i) => s + (i[metric] ?? 0), 0) / items.length,
        totalCap: items.reduce((s, i) => s + i.marketCap, 0),
      }))
      .sort((a, b) => b.totalCap - a.totalCap);
  }, [all, metric]);

  function getVal(item: ScreenerItem): number | null {
    return item[metric];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-xs text-text-secondary">Loading heatmap...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Metric</span>
        {(["change24h", "change7d", "volume"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === m
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            {m === "change24h" ? "24h %" : m === "change7d" ? "7d %" : "Volume"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sectors.map((sector) => (
          <div key={sector.name}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-primary">{sector.name}</h3>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-text-secondary">
                  {sector.items.length} assets
                </span>
                <span className={`font-mono ${
                  sector.avgChange >= 0 ? "text-green" : "text-red"
                }`}>
                  {sector.avgChange >= 0 ? "+" : ""}{sector.avgChange.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {sector.items.map((item) => {
                const val = getVal(item);
                const bg = getColor(val);
                const isVol = metric === "volume";
                const size = isVol ? Math.min(1, Math.log10(item.volume + 1) / 12) : 1;

                return (
                  <Link
                    key={item.id}
                    href={`/assets/${item.assetType === "crypto" ? item.id.replace("crypto-", "") : item.symbol}`}
                    className="group relative overflow-hidden rounded p-2.5 transition-opacity hover:opacity-85"
                    style={{ background: bg, opacity: isVol ? 0.4 + size * 0.6 : 1 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white drop-shadow-sm">{item.symbol}</span>
                      {item.image && (
                        <img src={item.image} alt="" className="h-3 w-3 rounded-full opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px]" style={{ color: getTextColor(val) }}>
                      {isVol
                        ? item.volume >= 1e9
                          ? `$${(item.volume / 1e9).toFixed(2)}B`
                          : `$${(item.volume / 1e6).toFixed(2)}M`
                        : val != null
                        ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`
                        : "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
