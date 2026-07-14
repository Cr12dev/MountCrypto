import { NextResponse } from "next/server";
import { fetchStockQuotes } from "@/lib/api/yahoo";
import { fetchCoinMarkets } from "@/lib/api/coingecko";

export type ScreenerItem = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  marketCap: number;
  volume: number;
  assetType: "stock" | "crypto";
  image?: string;
};

export async function GET() {
  try {
    const [stocks, coins] = await Promise.allSettled([
      fetchStockQuotes(),
      fetchCoinMarkets(1, 100),
    ]);

    const items: ScreenerItem[] = [];

    if (stocks.status === "fulfilled") {
      for (const s of stocks.value) {
        items.push({
          id: `stock-${s.symbol}`,
          symbol: s.symbol,
          name: s.name,
          price: s.price,
          change1h: s.changes["1h"] ?? null,
          change24h: s.changes["1d"] ?? s.changePercent,
          change7d: s.changes["7d"] ?? null,
          marketCap: s.marketCap ?? 0,
          volume: s.volume ?? 0,
          assetType: "stock",
        });
      }
    }

    if (coins.status === "fulfilled") {
      for (const c of coins.value) {
        items.push({
          id: `crypto-${c.id}`,
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          price: c.current_price ?? 0,
          change1h: c.price_change_percentage_1h_in_currency ?? null,
          change24h: c.price_change_percentage_24h ?? null,
          change7d: c.price_change_percentage_7d_in_currency ?? null,
          marketCap: c.market_cap ?? 0,
          volume: c.total_volume ?? 0,
          assetType: "crypto",
          image: c.image,
        });
      }
    }

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch screener data" }, { status: 502 });
  }
}
