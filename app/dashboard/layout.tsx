import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { BottomPanel } from "@/components/layout/BottomPanel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <MarketTicker />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <BottomPanel />
    </div>
  );
}
