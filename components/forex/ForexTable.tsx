"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { ForexQuote } from "@/lib/api/yahoo";
import { DataTable } from "@/components/ui/DataTable";
import { ChangeCell } from "@/components/ui/ChangeCell";
import { usePolling } from "@/lib/hooks/usePolling";
import { CHANGE_TIMEFRAMES } from "@/lib/api/timeframes";

export function ForexTable() {
  const [pairs, setPairs] = useState<ForexQuote[]>([]);
  const [query, setQuery] = useState("");

  const fetchForex = useCallback(() => {
    fetch("/api/forex")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPairs(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchForex(); }, [fetchForex]);
  usePolling(fetchForex, 10000);

  const filtered = useMemo(() => {
    if (!query.trim()) return pairs;
    const q = query.toLowerCase();
    return pairs.filter((p) => p.pair.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [pairs, query]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title-sm">Currency Pairs</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pair..."
          className="w-48 rounded border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "pair", label: "Pair",
            render: (p: ForexQuote) => (
              <a href={`/assets/${p.pair}`} className="font-mono text-xs font-medium text-accent">{p.pair}</a>
            ),
          },
          {
            key: "name", label: "Name",
            render: (p: ForexQuote) => <span className="text-xs text-text-primary">{p.name}</span>,
          },
          {
            key: "bid", label: "Bid",
            render: (p: ForexQuote) => <span className="font-mono text-xs text-text-primary">{p.bid.toFixed(p.bid < 3 ? 4 : 2)}</span>,
          },
          {
            key: "ask", label: "Ask",
            render: (p: ForexQuote) => <span className="font-mono text-xs text-text-primary">{p.ask.toFixed(p.ask < 3 ? 4 : 2)}</span>,
          },
          {
            key: "spread", label: "Spread",
            render: (p: ForexQuote) => {
              const spread = p.ask - p.bid;
              return <span className="font-mono text-xs text-text-secondary">{spread.toFixed(spread < 0.01 ? 5 : 4)}</span>;
            },
          },
          ...CHANGE_TIMEFRAMES.map((tf) => ({
            key: `change_${tf.key}`, label: tf.label,
            render: (p: ForexQuote) => <ChangeCell value={p.changes[tf.key]} />,
          })),
        ]}
        data={filtered}
      />
    </div>
  );
}
