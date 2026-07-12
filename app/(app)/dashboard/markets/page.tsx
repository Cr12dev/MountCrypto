import { MarketIndices } from "@/components/markets/MarketIndices";
import { StocksTable } from "@/components/markets/StocksTable";

export default function MarketsPage() {
  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="title-sm">Markets</h1>
        <p className="mt-1 text-xs text-text-secondary">Global indices and top stocks</p>
      </div>
      <div className="mb-6">
        <MarketIndices />
      </div>
      <StocksTable />
    </div>
  );
}
