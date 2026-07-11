"use client";

import { useEffect, useState, useCallback } from "react";
import type { IndexQuote } from "@/lib/api/yahoo";
import { usePolling } from "@/lib/hooks/usePolling";

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexQuote[]>([]);

  const fetchIndices = useCallback(() => {
    fetch("/api/stocks?type=indices")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setIndices(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchIndices(); }, [fetchIndices]);
  usePolling(fetchIndices, 10000);

  if (!indices.length) return null;

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {indices.map((idx) => {
        const up = idx.change >= 0;
        return (
          <div key={idx.symbol} className="bg-bg-card px-3 py-2.5">
            <p className="text-xs text-text-secondary">{idx.symbol}</p>
            <p className="mt-0.5 font-mono text-xs font-medium text-text-primary">
              {idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`font-mono text-xs ${up ? "text-green" : "text-red"}`}>
              {up ? "+" : ""}{idx.changePercent.toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
