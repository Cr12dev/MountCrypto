import { CommoditiesTable } from "@/components/commodities/CommoditiesTable";

export default function CommoditiesPage() {
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3">
        <h1 className="text-sm font-semibold">Commodities</h1>
        <p className="mt-0.5 text-xs text-text-secondary">Energy, metals, and agricultural products</p>
      </div>
      <CommoditiesTable />
    </div>
  );
}
