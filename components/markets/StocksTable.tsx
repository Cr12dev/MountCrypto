"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { StockQuote } from "@/lib/api/yahoo";
import { DataTable } from "@/components/ui/DataTable";
import { ChangeCell } from "@/components/ui/ChangeCell";
import { usePolling } from "@/lib/hooks/usePolling";
import { CHANGE_TIMEFRAMES } from "@/lib/api/timeframes";

function formatCompact(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

export function StocksTable() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [query, setQuery] = useState("");

  const fetchStocks = useCallback(() => {
    fetch("/api/stocks?type=stocks")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setStocks(data); })
      .catch(() => {});
  }, []);

  usePolling(fetchStocks, 10000);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  const filtered = useMemo(() => {
    if (!query.trim()) return stocks;
    const q = query.toLowerCase();
    return stocks.filter((s) => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
  }, [stocks, query]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title-sm">Major Stocks</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stock..."
          className="w-48 rounded border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "symbol", label: "Symbol",
            render: (s: StockQuote) => (
              <a href={`/assets/${s.symbol}`} className="font-mono text-xs font-medium text-accent">{s.symbol}</a>
            ),
          },
          {
            key: "name", label: "Name",
            render: (s: StockQuote) => <span className="text-xs text-text-primary">{s.name}</span>,
          },
          {
            key: "price", label: "Price",
            render: (s: StockQuote) => <span className="font-mono text-xs text-text-primary">${s.price.toFixed(2)}</span>,
          },
          ...CHANGE_TIMEFRAMES.map((tf) => ({
            key: `change_${tf.key}`, label: tf.label,
            render: (s: StockQuote) => <ChangeCell value={s.changes[tf.key]} />,
          })),
          {
            key: "marketCap", label: "Mkt Cap", hide: "sm" as const,
            render: (s: StockQuote) => <span className="font-mono text-xs text-text-primary">{formatCompact(s.marketCap)}</span>,
          },
          {
            key: "volume", label: "Volume", hide: "md" as const,
            render: (s: StockQuote) => <span className="font-mono text-xs text-text-secondary">{formatCompact(s.volume)}</span>,
          },
        ]}
        data={filtered}
      />
    </div>
  );
}
