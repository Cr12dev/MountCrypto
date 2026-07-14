"use client";

import { useState, useEffect } from "react";
import { CandlestickChart } from "./CandlestickChart";
import type { OhlcBar } from "@/lib/api/yahoo";

const TIMEFRAMES = [
  { label: "1D", days: "1" },
  { label: "7D", days: "7" },
  { label: "1M", days: "30" },
  { label: "1Y", days: "365" },
];

export function AssetChartSection({
  symbol,
  assetType,
}: {
  symbol: string;
  assetType: string;
}) {
  const [days, setDays] = useState("7");
  const [data, setData] = useState<OhlcBar[]>([]);
  const [chartHeight, setChartHeight] = useState(400);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/ohlc?symbol=${encodeURIComponent(symbol)}&type=${assetType}&days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (Array.isArray(json)) setData(json);
        else setData([]);
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, assetType, days]);

  return (
    <div className="rounded-lg border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.days}
              onClick={() => setDays(tf.days)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                days === tf.days
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartHeight((h) => Math.min(640, h + 40))}
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            title="Enlarge"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
          <button
            onClick={() => setChartHeight((h) => Math.max(200, h - 40))}
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            title="Reduce"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="p-1 pt-2">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-xs text-text-secondary">Loading chart...</span>
          </div>
        ) : data.length > 0 ? (
          <CandlestickChart data={data} height={chartHeight} />
        ) : (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-xs text-text-secondary">No data available</span>
          </div>
        )}
      </div>
    </div>
  );
}
