"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { CommodityQuote } from "@/lib/api/yahoo";
import { DataTable } from "@/components/ui/DataTable";
import { ChangeCell } from "@/components/ui/ChangeCell";
import { usePolling } from "@/lib/hooks/usePolling";
import { CHANGE_TIMEFRAMES } from "@/lib/api/timeframes";

export function CommoditiesTable() {
  const [items, setItems] = useState<CommodityQuote[]>([]);
  const [query, setQuery] = useState("");

  const fetchCommodities = useCallback(() => {
    fetch("/api/commodities")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchCommodities(); }, [fetchCommodities]);
  usePolling(fetchCommodities, 10000);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title-sm">Commodities</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-48 rounded border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "symbol", label: "Symbol",
            render: (c: CommodityQuote) => (
              <a href={`/assets/${c.symbol}`} className="font-mono text-xs font-medium text-accent">{c.symbol}</a>
            ),
          },
          {
            key: "name", label: "Name",
            render: (c: CommodityQuote) => <span className="text-xs text-text-primary">{c.name}</span>,
          },
          {
            key: "price", label: "Price",
            render: (c: CommodityQuote) => <span className="font-mono text-xs text-text-primary">${c.price.toFixed(c.price < 10 ? 3 : 2)}</span>,
          },
          {
            key: "unit", label: "Unit",
            render: (c: CommodityQuote) => <span className="font-mono text-xs text-text-secondary">{c.unit}</span>,
          },
          ...CHANGE_TIMEFRAMES.map((tf) => ({
            key: `change_${tf.key}`, label: tf.label,
            render: (c: CommodityQuote) => <ChangeCell value={c.changes[tf.key]} />,
          })),
        ]}
        data={filtered}
      />
    </div>
  );
}
