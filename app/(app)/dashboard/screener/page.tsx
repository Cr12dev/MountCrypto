import { MarketScreener } from "@/components/screener/MarketScreener";

export const dynamic = "force-dynamic";

export default function ScreenerPage() {
  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="title-sm">Market Screener</h1>
        <p className="mt-1 text-xs text-text-secondary">Filter stocks and crypto by price, change, volume, and market cap</p>
      </div>
      <MarketScreener />
    </div>
  );
}
