import { fetchCoinDetail } from "@/lib/api/coingecko";
import { getStockQuote, getForexQuote, getCommodityQuote } from "@/lib/api/yahoo";
import { notFound } from "next/navigation";
import { AssetHeader } from "@/components/assets/AssetHeader";
import { AssetStats } from "@/components/assets/AssetStats";
import { PriceChart } from "@/components/charts/PriceChart";
import { DemoAssetDetail } from "@/components/assets/DemoAssetDetail";
import Link from "next/link";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const coinId = symbol.toLowerCase();

  const stock = await getStockQuote(symbol);
  if (stock) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <Link href="/dashboard" className="mb-4 inline-block text-xs text-text-secondary transition-colors hover:text-text-primary">
          ← Back to Markets
        </Link>
        <DemoAssetDetail
          name={stock.name}
          symbol={stock.symbol}
          price={stock.price}
          change={stock.changePercent}
          type="Stock"
        />
      </div>
    );
  }

  const forex = await getForexQuote(symbol);
  if (forex) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <Link href="/dashboard/forex" className="mb-4 inline-block text-xs text-text-secondary transition-colors hover:text-text-primary">
          ← Back to Forex
        </Link>
        <DemoAssetDetail
          name={forex.name}
          symbol={forex.pair}
          price={(forex.bid + forex.ask) / 2}
          change={forex.changePercent}
          type="Forex"
        />
      </div>
    );
  }

  const commodity = await getCommodityQuote(symbol);
  if (commodity) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        <Link href="/dashboard/commodities" className="mb-4 inline-block text-xs text-text-secondary transition-colors hover:text-text-primary">
          ← Back to Commodities
        </Link>
        <DemoAssetDetail
          name={commodity.name}
          symbol={commodity.symbol}
          price={commodity.price}
          change={commodity.changePercent}
          type={commodity.unit}
        />
      </div>
    );
  }

  let coin;
  try {
    coin = await fetchCoinDetail(coinId);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Link href="/dashboard/crypto" className="mb-4 inline-block text-xs text-text-secondary transition-colors hover:text-text-primary">
        ← Back to Crypto
      </Link>
      <AssetHeader coin={coin} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
        <PriceChart coinId={coinId} />
        <AssetStats coin={coin} />
      </div>
      {coin.description.en && (
        <div className="mt-4 rounded-lg border border-border bg-bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">About</p>
          <p
            className="text-xs leading-relaxed text-text-secondary [&_a]:text-accent [&_a]:hover:underline"
            dangerouslySetInnerHTML={{ __html: coin.description.en.split(". ").slice(0, 5).join(". ") + "." }}
          />
        </div>
      )}
    </div>
  );
}
