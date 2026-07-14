import { MarketHeatmap } from "@/components/heatmap/MarketHeatmap";

export const dynamic = "force-dynamic";

export default function HeatmapPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Market Heatmap</h1>
        <p className="mt-1 text-sm text-text-secondary">Sector and asset performance at a glance</p>
      </div>
      <MarketHeatmap />
    </div>
  );
}
