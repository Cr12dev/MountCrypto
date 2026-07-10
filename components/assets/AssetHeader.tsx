import Image from "next/image";
import type { CoinDetail } from "@/lib/api/coingecko";
import { AddToWatchlistButton } from "@/components/watchlist/AddToWatchlistButton";

function formatPrice(n: number) {
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

export function AssetHeader({ coin }: { coin: CoinDetail }) {
  const price = coin.market_data.current_price.usd;
  const change24h = coin.market_data.price_change_percentage_24h;
  const change7d = coin.market_data.price_change_percentage_7d;
  const up = change24h >= 0;

  return (
    <div className="flex items-center gap-3">
      <Image src={coin.image.small} alt="" width={28} height={28} className="rounded-full" />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-text-primary">{coin.name}</h1>
          <span className="font-mono text-xs uppercase text-text-secondary">{coin.symbol}</span>
            <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary">
              #{coin.market_data.market_cap_rank}
            </span>
            <AddToWatchlistButton symbol={coin.symbol} assetType="crypto" />
        </div>
        <div className="mt-0.5 flex items-center gap-3">
          <span className="font-mono text-lg font-semibold text-text-primary">
            ${formatPrice(price)}
          </span>
          <span className={`font-mono text-xs ${up ? "text-green" : "text-red"}`}>
            {up ? "+" : ""}{change24h.toFixed(2)}%
          </span>
          <span className="font-mono text-xs text-text-secondary">24h</span>
          <span className={`font-mono text-xs ${change7d >= 0 ? "text-green" : "text-red"}`}>
            {change7d >= 0 ? "+" : ""}{change7d.toFixed(2)}%
          </span>
          <span className="font-mono text-xs text-text-secondary">7d</span>
        </div>
      </div>
    </div>
  );
}
