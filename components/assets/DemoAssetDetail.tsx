import { AddToWatchlistButton } from "@/components/watchlist/AddToWatchlistButton";
import { AssetChartSection } from "@/components/charts/AssetChartSection";
import { RelatedNews } from "@/components/news/RelatedNews";

function formatPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

const assetTypeMap: Record<string, string> = {
  Stock: "stock",
  Forex: "forex",
  Commodity: "commodity",
};

export function DemoAssetDetail({
  name,
  symbol,
  price,
  change,
  type,
}: {
  name: string;
  symbol: string;
  price: number;
  change: number;
  type: string;
}) {
  const up = change >= 0;
  const assetType = assetTypeMap[type] || "stock";

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-surface font-mono text-xs font-bold text-text-primary">
          {symbol.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-text-primary">{name}</h1>
            <span className="font-mono text-xs uppercase text-text-secondary">{symbol}</span>
            <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary">{type}</span>
            <AddToWatchlistButton symbol={symbol} assetType={assetType} />
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-text-primary">
              ${formatPrice(price)}
            </span>
            <span className={`font-mono text-xs ${up ? "text-green" : "text-red"}`}>
              {up ? "+" : ""}{change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <AssetChartSection symbol={symbol} assetType={assetType} />
      </div>
      <div className="mt-4">
        <RelatedNews symbol={symbol} />
      </div>
    </>
  );
}
