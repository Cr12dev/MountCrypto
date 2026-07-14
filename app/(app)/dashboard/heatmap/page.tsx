import { MarketHeatmap } from "@/components/heatmap/MarketHeatmap";

export const dynamic = "force-dynamic";

export default function HeatmapPage() {
  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="title-sm">Market Heatmap</h1>
        <p className="mt-1 text-xs text-text-secondary">Sector and asset performance at a glance</p>
      </div>
      <MarketHeatmap />
    </div>
  );
}
