"use client";

import { useState } from "react";

const tabs = ["News", "Activity"] as const;
type Tab = (typeof tabs)[number];

const news = [
  { time: "2h", text: "Fed holds rates steady at 5.25-5.50%" },
  { time: "4h", text: "Bitcoin breaks $67K as ETF inflows surge" },
  { time: "6h", text: "Crude oil rises on OPEC+ supply concerns" },
  { time: "8h", text: "European markets open mixed amid earnings" },
  { time: "12h", text: "NVIDIA announces new AI chip lineup" },
];

export function BottomPanel() {
  const [tab, setTab] = useState<Tab>("News");
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="border-t border-border bg-bg-surface">
        <button
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-center py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          ▲ News & Activity
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                tab === t
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          ▼
        </button>
      </div>
      <div className="px-4 py-2">
        {tab === "News" && (
          <div className="flex items-center gap-6 overflow-hidden">
            {news.map((item) => (
              <div key={item.text} className="flex shrink-0 items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />
                <span className="text-xs text-text-secondary">{item.time}</span>
                <span className="whitespace-nowrap text-sm text-text-primary">{item.text}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "Activity" && (
          <p className="py-1 text-xs text-text-secondary">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
