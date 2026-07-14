"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { ScreenerItem } from "@/app/api/screener/route";

const PRESETS = [
  { label: "All", assetType: "all" as const, label2: "All Assets" },
  { label: "Gainers", assetType: "all" as const, changeMin: 2, label2: "24h Gainers" },
  { label: "Losers", assetType: "all" as const, changeMax: -2, label2: "24h Losers" },
  { label: "Stocks", assetType: "stock" as const, label2: "Stocks" },
  { label: "Crypto", assetType: "crypto" as const, label2: "Crypto" },
];

function fmtPrice(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtChange(n: number | null) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function changeColor(n: number | null): string {
  if (n == null) return "text-text-secondary";
  return n >= 0 ? "text-green" : "text-red";
}

function changeBg(n: number | null): string {
  if (n == null) return "";
  return n >= 0 ? "bg-green/10" : "bg-red/10";
}

export function MarketScreener() {
  const [all, setAll] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [changeMin, setChangeMin] = useState("");
  const [changeMax, setChangeMax] = useState("");
  const [volMin, setVolMin] = useState("");
  const [activePreset, setActivePreset] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/screener")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAll(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const preset = PRESETS[activePreset];

  const filtered = useMemo(() => {
    let items = all;

    if (preset.assetType !== "all") items = items.filter((i) => i.assetType === preset.assetType);
    if (preset.changeMin !== undefined) items = items.filter((i) => (i.change24h ?? -999) >= preset.changeMin!);
    if (preset.changeMax !== undefined) items = items.filter((i) => (i.change24h ?? 999) <= preset.changeMax!);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }
    if (priceMin) items = items.filter((i) => i.price >= Number(priceMin));
    if (priceMax) items = items.filter((i) => i.price <= Number(priceMax));
    if (changeMin) items = items.filter((i) => (i.change24h ?? -999) >= Number(changeMin));
    if (changeMax) items = items.filter((i) => (i.change24h ?? 999) <= Number(changeMax));
    if (volMin) items = items.filter((i) => i.volume >= Number(volMin));

    items.sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (["change1h", "change24h", "change7d"].includes(sortKey)) {
        av = av ?? -Infinity;
        bv = bv ?? -Infinity;
      }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return items;
  }, [all, preset, search, priceMin, priceMax, changeMin, changeMax, volMin, sortKey, sortDir]);

  function handleSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function selectPreset(idx: number) {
    setActivePreset(idx);
    setPriceMin("");
    setPriceMax("");
    setChangeMin("");
    setChangeMax("");
    setVolMin("");
    setSearch("");
  }

  const maxVolume = useMemo(() => Math.max(...filtered.map((i) => i.volume), 1), [filtered]);
  const hasFilters = priceMin || priceMax || changeMin || changeMax || volMin || search;

  const SORT_ARROW = (key: string) => (
    <span className={`ml-0.5 inline-block text-[8px] leading-none ${sortKey === key ? "opacity-100" : "opacity-30"}`}>
      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "▽"}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => selectPreset(i)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activePreset === i
                  ? "bg-accent/15 text-accent shadow-sm"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {p.label2}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <svg className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-40 rounded-md border border-border bg-bg-surface pl-7 pr-2 text-xs font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/50 focus:border-accent lg:w-52"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Price</span>
            <input type="number" placeholder="Min" value={priceMin} onChange={(e) => { setActivePreset(0); setPriceMin(e.target.value); }}
              className="h-6 w-18 rounded border border-border bg-bg-surface px-1.5 text-[11px] font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-accent" />
            <span className="text-text-secondary/50">—</span>
            <input type="number" placeholder="Max" value={priceMax} onChange={(e) => { setActivePreset(0); setPriceMax(e.target.value); }}
              className="h-6 w-18 rounded border border-border bg-bg-surface px-1.5 text-[11px] font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-accent" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">24h %</span>
            <input type="number" placeholder="Min" value={changeMin} onChange={(e) => { setActivePreset(0); setChangeMin(e.target.value); }}
              className="h-6 w-16 rounded border border-border bg-bg-surface px-1.5 text-[11px] font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-accent" />
            <span className="text-text-secondary/50">—</span>
            <input type="number" placeholder="Max" value={changeMax} onChange={(e) => { setActivePreset(0); setChangeMax(e.target.value); }}
              className="h-6 w-16 rounded border border-border bg-bg-surface px-1.5 text-[11px] font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-accent" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Volume</span>
            <input type="number" placeholder="Min $" value={volMin} onChange={(e) => { setActivePreset(0); setVolMin(e.target.value); }}
              className="h-6 w-24 rounded border border-border bg-bg-surface px-1.5 text-[11px] font-mono text-text-primary outline-none transition-colors placeholder:text-text-secondary/40 focus:border-accent" />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setPriceMin(""); setPriceMax(""); setChangeMin(""); setChangeMax(""); setVolMin(""); setSearch(""); setActivePreset(0); }}
              className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-bg-card py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs text-text-secondary">Loading screener data...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-surface/50 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-left">
                    <button onClick={() => handleSort("symbol")} className="flex items-center gap-1 transition-colors hover:text-text-primary">
                      Symbol{SORT_ARROW("symbol")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-left">
                    <button onClick={() => handleSort("name")} className="flex items-center gap-1 transition-colors hover:text-text-primary">
                      Name{SORT_ARROW("name")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("price")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      Price{SORT_ARROW("price")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("change1h")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      1h{SORT_ARROW("change1h")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("change24h")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      24h{SORT_ARROW("change24h")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("change7d")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      7d{SORT_ARROW("change7d")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("marketCap")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      Mkt Cap{SORT_ARROW("marketCap")}
                    </button>
                  </th>
                  <th className="sticky top-0 z-10 bg-bg-card px-3 py-2.5 text-right">
                    <button onClick={() => handleSort("volume")} className="flex items-center justify-end gap-1 transition-colors hover:text-text-primary">
                      Volume{SORT_ARROW("volume")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center">
                      <span className="text-xs text-text-secondary">No assets match your filters</span>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`group border-b border-border/20 transition-colors hover:bg-bg-hover/30 ${
                        i % 2 === 1 ? "bg-bg-surface/10" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/assets/${row.assetType === "crypto" ? row.id.replace("crypto-", "") : row.symbol}`}
                          className="flex items-center gap-2 transition-colors"
                        >
                          {row.image && (
                            <img src={row.image} alt="" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <span className="font-mono text-sm font-semibold text-text-primary group-hover:text-accent">{row.symbol}</span>
                          <span className={`rounded px-1 py-[1px] text-[9px] font-semibold uppercase tracking-wider ${
                            row.assetType === "crypto" ? "bg-accent/10 text-accent" : "bg-green/10 text-green"
                          }`}>
                            {row.assetType === "crypto" ? "C" : "S"}
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-xs text-text-secondary">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-medium text-text-primary">
                        {fmtPrice(row.price)}
                      </td>
                      {[row.change1h, row.change24h, row.change7d].map((chg, ci) => (
                        <td key={ci} className={`px-3 py-2 text-right ${changeBg(chg)}`}>
                          <span className={`inline-block rounded px-1.5 py-[1px] font-mono text-[11px] font-medium leading-tight ${changeColor(chg)}`}>
                            {fmtChange(chg)}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">
                        {fmtPrice(row.marketCap)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-bg-surface sm:w-20">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (row.volume / maxVolume) * 100)}%`,
                                background: "linear-gradient(90deg, #2962ff, #089981)",
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-text-secondary">
                            {row.volume >= 1e9
                              ? `${(row.volume / 1e9).toFixed(1)}B`
                              : `${(row.volume / 1e6).toFixed(1)}M`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-[10px] text-text-secondary">
              <span className="font-mono font-medium text-text-primary">{filtered.length}</span> / {all.length} assets
            </span>
            <div className="flex items-center gap-2 text-[10px] text-text-secondary">
              <span>Stocks: <span className="font-mono text-text-primary">{all.filter((i) => i.assetType === "stock").length}</span></span>
              <span className="text-border">|</span>
              <span>Crypto: <span className="font-mono text-text-primary">{all.filter((i) => i.assetType === "crypto").length}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
