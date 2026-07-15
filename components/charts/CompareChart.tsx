"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { OhlcBar } from "@/lib/api/yahoo";

const COLORS = ["#2962ff", "#089981", "#f23645", "#f7931a", "#e040fb", "#ff8a65"];

type Series = {
  symbol: string;
  data: OhlcBar[];
  color: string;
};

function fmtDate(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function CompareChart({ symbols, assetType }: { symbols: string[]; assetType: string }) {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbols.length) { setSeries([]); return; }
    let cancelled = false;
    setLoading(true);

    Promise.all(
      symbols.map(async (sym, i) => {
        try {
          const res = await fetch(`/api/ohlc?symbol=${encodeURIComponent(sym)}&type=${assetType}&days=30`);
          const data = await res.json();
          if (!Array.isArray(data)) return null;
          return { symbol: sym, data: data as OhlcBar[], color: COLORS[i % COLORS.length] };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setSeries(results.filter((r): r is Series => r !== null && r.data.length > 10));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [symbols, assetType]);

  const chartData = useMemo(() => {
    if (!series.length) return [];

    const basePrices: Record<string, number> = {};
    for (const s of series) {
      if (s.data.length) basePrices[s.symbol] = s.data[0].close;
    }

    const maxLen = Math.max(...series.map((s) => s.data.length));
    const result: Record<string, any>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, any> = { index: i };
      for (const s of series) {
        const offset = s.data.length - maxLen + i;
        if (offset >= 0 && offset < s.data.length) {
          const base = basePrices[s.symbol];
          if (base) point[s.symbol] = ((s.data[offset].close - base) / base) * 100;
        }
      }
      result.push(point);
    }
    return result;
  }, [series]);

  if (!symbols.length) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
          Comparison (% change from start)
        </span>
        {loading && <span className="text-[10px] text-text-secondary">Loading...</span>}
      </div>

      {series.length === 0 && !loading && (
        <p className="py-4 text-center text-xs text-text-secondary">No comparison data available</p>
      )}

      {series.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 2, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e222d" />
            <XAxis dataKey="index" stroke="#5d6573" tick={false} axisLine={{ stroke: "#1e222d" }} />
            <YAxis
              tickFormatter={fmtPct}
              stroke="#5d6573"
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{ background: "#111520", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 11 }}
              labelFormatter={() => ""}
              formatter={(val: number, name: string) => [fmtPct(val), name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
            />
            {series.map((s) => (
              <Line
                key={s.symbol}
                type="monotone"
                dataKey={s.symbol}
                stroke={s.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
