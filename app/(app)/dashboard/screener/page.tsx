import { MarketScreener } from "@/components/screener/MarketScreener";

export const dynamic = "force-dynamic";

export default function ScreenerPage() {
  return (
    <div>
      <div className="mb-6 p-6">
        <h1 className="text-xl font-bold text-text-primary">Market Screener</h1>
        <p className="mt-1 text-sm text-text-secondary">Filter stocks and crypto by price, change, volume, and market cap</p>
      </div>
      <MarketScreener />
    </div>
  );
}
