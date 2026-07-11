"use client";

import { useState, useCallback } from "react";
import { usePolling } from "@/lib/hooks/usePolling";
import type { IndexQuote } from "@/lib/api/yahoo";

type CoinBrief = { id: string; symbol: string; current_price: number; price_change_percentage_24h: number };

type TickerItem = {
  label: string;
  value: string;
  change: string;
  up: boolean;
};

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [indices, coins] = await Promise.all([
        fetch("/api/stocks?type=indices").then((r) => r.json()),
        fetch("/api/crypto?per_page=3").then((r) => r.json()),
      ]);

      const ticker: TickerItem[] = [];

      if (Array.isArray(indices)) {
        (indices as IndexQuote[]).forEach((idx) => {
          ticker.push({
            label: idx.symbol,
            value: idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: `${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%`,
            up: idx.changePercent >= 0,
          });
        });
      }

      if (Array.isArray(coins)) {
        (coins as CoinBrief[]).slice(0, 3).forEach((c) => {
          const change = c.price_change_percentage_24h ?? 0;
          ticker.push({
            label: `${c.symbol.toUpperCase()}/USD`,
            value: `$${c.current_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
            up: change >= 0,
          });
        });
      }

      if (ticker.length) setItems(ticker);
    } catch {}
  }, []);

  usePolling(fetchAll, 10000);

  if (!items.length) {
    return (
      <div className="overflow-hidden border-b border-border bg-bg-card/50">
        <div className="py-2 text-center text-xs text-text-secondary">Loading ticker…</div>
      </div>
    );
  }

  const content = (
    <div className="flex items-center gap-8">
      {items.map((item) => (
        <div key={item.label} className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">{item.label}</span>
          <span className="font-mono text-sm text-text-primary">{item.value}</span>
          <span className={`font-mono text-xs ${item.up ? "text-green" : "text-red"}`}>
            {item.change}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-border bg-bg-card/50">
      <div className="flex animate-ticker py-2">
        {content}
        {content}
      </div>
    </div>
  );
}
