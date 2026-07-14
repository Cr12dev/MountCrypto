"use client";

import { useState, useEffect, useMemo } from "react";
import { CandlestickChart } from "./CandlestickChart";
import type { OhlcBar } from "@/lib/api/yahoo";
import { computeIndicators, scanPatterns } from "@/lib/indicators";
import type { ActiveIndicator } from "./CandlestickChart";

const TIMEFRAMES = [
  { label: "1H", days: "5", interval: "1h" },
  { label: "1D", days: "1" },
  { label: "7D", days: "7" },
  { label: "1M", days: "30" },
  { label: "1Y", days: "365" },
];

const INDICATOR_BTNS: { key: ActiveIndicator; label: string }[] = [
  { key: "sma20", label: "SMA 20" },
  { key: "sma50", label: "SMA 50" },
  { key: "sma200", label: "SMA 200" },
  { key: "ema12", label: "EMA 12" },
  { key: "ema26", label: "EMA 26" },
  { key: "bollinger", label: "Bollinger" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
  { key: "patterns", label: "Patterns" },
];

export function AssetChartSection({
  symbol,
  assetType,
}: {
  symbol: string;
  assetType: string;
}) {
  const [{ days, interval }, setTimeframe] = useState({ days: "7", interval: undefined as string | undefined });
  const [data, setData] = useState<OhlcBar[]>([]);
  const [chartHeight, setChartHeight] = useState(400);
  const [loading, setLoading] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ symbol, type: assetType, days });
    if (interval) params.set("interval", interval);
    fetch(`/api/ohlc?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (Array.isArray(json)) setData(json);
        else setData([]);
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, assetType, days, interval]);

  const indicators = useMemo(() => data.length > 0 ? computeIndicators(data) : undefined, [data]);
  const patterns = useMemo(() => data.length > 0 ? scanPatterns(data) : undefined, [data]);

  function toggleIndicator(key: ActiveIndicator) {
    setActiveIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          <div className="flex gap-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.label}
                onClick={() => setTimeframe({ days: tf.days, interval: (tf as any).interval })}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  days === tf.days && interval === ((tf as any).interval ?? undefined)
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-0.5">
            {INDICATOR_BTNS.map((btn) => (
              <button
                key={btn.key}
                onClick={() => toggleIndicator(btn.key)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  activeIndicators.includes(btn.key)
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {btn.label}
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
      </div>
      <div className="p-1 pt-2">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-xs text-text-secondary">Loading chart...</span>
          </div>
        ) : data.length > 0 ? (
          <CandlestickChart
            data={data}
            height={chartHeight}
            indicators={indicators}
            patterns={patterns}
            activeIndicators={activeIndicators}
          />
        ) : (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <span className="text-xs text-text-secondary">No data available</span>
          </div>
        )}
      </div>
    </div>
  );
}
