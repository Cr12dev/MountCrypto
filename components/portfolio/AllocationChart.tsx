"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2962ff", "#089981", "#f23645", "#ff9800", "#9c27b0", "#00bcd4", "#ffeb3b", "#795548", "#607d8b", "#e91e63"];

type HoldingAllocation = {
  symbol: string;
  value: number;
  asset_type: string;
};

export function AllocationChart({ holdings }: { holdings: HoldingAllocation[] }) {
  const filtered = holdings.filter((h) => h.value > 0);
  if (!filtered.length) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="symbol" cx="50%" cy="50%" innerRadius={44} outerRadius={64} stroke="none">
            {filtered.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e222d", border: "1px solid #363a45", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            formatter={(value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-2">
        {filtered.map((h, i) => (
          <div key={h.symbol} className="flex items-center gap-1 text-xs text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {h.symbol}
          </div>
        ))}
      </div>
    </div>
  );
}
