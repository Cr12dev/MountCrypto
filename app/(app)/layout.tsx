"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { BottomPanel } from "@/components/layout/BottomPanel";
import { NewsProvider } from "@/components/news/NewsContext";
import { NewsRightSidebar } from "@/components/news/NewsRightSidebar";
import { MarketGlow } from "@/components/ambient/MarketGlow";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NewsProvider>
      <MarketGlow />
      <div className="relative z-10 flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
            <MarketTicker />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <NewsRightSidebar />
        </div>
        <BottomPanel />
      </div>
    </NewsProvider>
  );
}
