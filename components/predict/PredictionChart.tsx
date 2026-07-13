"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ChartPoint = {
  date: string;
  predicted_price: number;
  upper_bound: number;
  lower_bound: number;
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}`;
}

function formatPrice(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-mono text-xs text-text-secondary">{label}</p>
      <p className="font-mono text-sm font-semibold text-accent">
        ${p.predicted_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className="mt-1 flex gap-3 font-mono text-xs">
        <span className="text-green">↑ ${p.upper_bound.toLocaleString()}</span>
        <span className="text-red">↓ ${p.lower_bound.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function PredictionChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2962ff" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#2962ff" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e222d" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#5d6573"
          tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#1e222d" }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["dataMin - 500", "dataMax + 500"]}
          tickFormatter={formatPrice}
          stroke="#5d6573"
          tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#5d6573", strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          dataKey="upper_bound"
          fill="url(#bandGrad)"
          stroke="none"
        />
        <Area
          type="monotone"
          dataKey="lower_bound"
          fill="#131722"
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="predicted_price"
          stroke="#2962ff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#2962ff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
