import type { CoinDetail } from "@/lib/api/coingecko";

function formatCompact(n: number | null) {
  if (n === null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

function formatSupply(n: number | null) {
  if (n === null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("en-US");
}

const statStyle = "flex items-center justify-between border-b border-border/30 px-4 py-2 last:border-0";

export function AssetStats({ coin }: { coin: CoinDetail }) {
  const md = coin.market_data;
  const stats = [
    { label: "Market Cap", value: formatCompact(md.market_cap.usd) },
    { label: "Market Cap Rank", value: `#${md.market_cap_rank}` },
    { label: "24h Volume", value: formatCompact(md.total_volume.usd) },
    { label: "24h High", value: `$${md.high_24h.usd.toLocaleString("en-US")}` },
    { label: "24h Low", value: `$${md.low_24h.usd.toLocaleString("en-US")}` },
    { label: "Circulating Supply", value: formatSupply(md.circulating_supply) },
    { label: "Total Supply", value: formatSupply(md.total_supply) },
    { label: "Max Supply", value: formatSupply(md.max_supply) },
    { label: "All-Time High", value: `$${md.ath.usd.toLocaleString("en-US")}` },
    { label: "ATH Date", value: new Date(md.ath_date.usd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
  ];

  return (
    <div className="rounded-lg border border-border bg-bg-card">
      <p className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
        Statistics
      </p>
      {stats.map((s) => (
        <div key={s.label} className={statStyle}>
          <span className="text-xs text-text-secondary">{s.label}</span>
          <span className="font-mono text-xs text-text-primary">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
