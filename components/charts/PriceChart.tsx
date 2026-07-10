"use client";

import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const timeframes = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "1Y", days: 365 },
];

function formatDate(ts: number, days: number) {
  const d = new Date(ts);
  if (days <= 1) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (days <= 7) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPrice(n: number) {
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

export function PriceChart({ coinId }: { coinId: string }) {
  const [days, setDays] = useState(1);
  const [data, setData] = useState<{ t: number; p: number }[]>([]);

  useEffect(() => {
    fetch(`/api/crypto/${coinId}?days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        const prices = (json.prices as [number, number][]) ?? [];
        setData(prices.map(([t, p]) => ({ t, p })));
      })
      .catch(() => {});
  }, [coinId, days]);

  const startPrice = data[0]?.p ?? 0;
  const endPrice = data[data.length - 1]?.p ?? 0;
  const up = endPrice >= startPrice;
  const color = up ? "#089981" : "#f23645";
  const change = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <span className="font-mono text-xl font-semibold text-text-primary">
            ${formatPrice(endPrice)}
          </span>
          <span className={`ml-2 font-mono text-xs ${up ? "text-green" : "text-red"}`}>
            {up ? "+" : ""}{change.toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-0.5">
          {timeframes.map((tf) => (
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
      </div>
      <div className="px-1 pb-1 pt-2">
        {data.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`pc-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={(ts) => formatDate(ts, days)}
                tick={{ fontSize: 10, fill: "#787b86" }}
                axisLine={false}
                tickLine={false}
                minTickGap={50}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => `$${formatPrice(v)}`}
                tick={{ fontSize: 10, fill: "#787b86" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e222d",
                  border: "1px solid #363a45",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleString()}
                formatter={(value: number) => [`$${formatPrice(value)}`, "Price"]}
              />
              <Area
                type="monotone"
                dataKey="p"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#pc-${color.replace("#", "")})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
