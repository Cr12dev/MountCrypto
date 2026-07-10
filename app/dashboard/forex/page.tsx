import { ForexTable } from "@/components/forex/ForexTable";

export default function ForexPage() {
  return (
    <div className="p-4">
      <div className="mb-3">
        <h1 className="text-sm font-semibold">Forex</h1>
        <p className="mt-0.5 text-xs text-text-secondary">Major currency pairs</p>
      </div>
      <ForexTable />
    </div>
  );
}
