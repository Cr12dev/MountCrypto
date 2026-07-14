"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { ChangeCell } from "@/components/ui/ChangeCell";
import type { ScreenerItem } from "@/app/api/screener/route";

export function MarketScreener() {
  const [all, setAll] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [assetType, setAssetType] = useState<"all" | "stock" | "crypto">("all");
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [changeMin, setChangeMin] = useState("");
  const [changeMax, setChangeMax] = useState("");
  const [volMin, setVolMin] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/screener")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAll(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = all;

    if (assetType !== "all") items = items.filter((i) => i.assetType === assetType);
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
      let av: number | string = (a as any)[sortKey];
      let bv: number | string = (b as any)[sortKey];
      if (sortKey === "change1h" || sortKey === "change24h" || sortKey === "change7d") {
        av = av ?? -Infinity;
        bv = bv ?? -Infinity;
      }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return items;
  }, [all, assetType, search, priceMin, priceMax, changeMin, changeMax, volMin, sortKey, sortDir]);

  function handleSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const columns = [
    {
      key: "symbol",
      label: "Symbol",
      sortable: true,
      render: (row: ScreenerItem) => (
        <Link
          href={`/assets/${row.assetType === "crypto" ? row.id.replace("crypto-", "") : row.symbol}`}
          className="flex items-center gap-2 font-mono text-sm font-medium text-text-primary hover:text-accent"
        >
          {row.image && (
            <img src={row.image} alt="" className="h-4 w-4 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <span>{row.symbol}</span>
          <span className="text-text-secondary font-sans text-[10px] uppercase tracking-wider">{row.assetType}</span>
        </Link>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      hide: "sm" as const,
      render: (row: ScreenerItem) => <span className="text-xs text-text-secondary">{row.name}</span>,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (row: ScreenerItem) => (
        <span className="font-mono text-xs">
          {row.price >= 1000
            ? row.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : row.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </span>
      ),
    },
    {
      key: "change1h",
      label: "1h",
      sortable: true,
      render: (row: ScreenerItem) => <ChangeCell value={row.change1h} />,
    },
    {
      key: "change24h",
      label: "24h",
      sortable: true,
      render: (row: ScreenerItem) => <ChangeCell value={row.change24h} />,
    },
    {
      key: "change7d",
      label: "7d",
      sortable: true,
      hide: "sm" as const,
      render: (row: ScreenerItem) => <ChangeCell value={row.change7d} />,
    },
    {
      key: "marketCap",
      label: "Mkt Cap",
      sortable: true,
      hide: "sm" as const,
      render: (row: ScreenerItem) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.marketCap >= 1e12
            ? `$${(row.marketCap / 1e12).toFixed(2)}T`
            : row.marketCap >= 1e9
            ? `$${(row.marketCap / 1e9).toFixed(2)}B`
            : row.marketCap >= 1e6
            ? `$${(row.marketCap / 1e6).toFixed(2)}M`
            : `$${(row.marketCap / 1e3).toFixed(1)}K`}
        </span>
      ),
    },
    {
      key: "volume",
      label: "Volume",
      sortable: true,
      hide: "md" as const,
      render: (row: ScreenerItem) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.volume >= 1e9
            ? `$${(row.volume / 1e9).toFixed(2)}B`
            : row.volume >= 1e6
            ? `$${(row.volume / 1e6).toFixed(2)}M`
            : `$${(row.volume / 1e3).toFixed(1)}K`}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-card p-3">
        <div className="flex gap-1">
          {(["all", "stock", "crypto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAssetType(t)}
              className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                assetType === t
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {t === "all" ? "All" : t === "stock" ? "Stocks" : "Crypto"}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search symbol or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 flex-1 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent min-w-[120px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary">Price</span>
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-7 w-20 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
            <span className="text-text-secondary">—</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-7 w-20 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary">24h %</span>
            <input
              type="number"
              placeholder="Min"
              value={changeMin}
              onChange={(e) => setChangeMin(e.target.value)}
              className="h-7 w-16 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
            <span className="text-text-secondary">—</span>
            <input
              type="number"
              placeholder="Max"
              value={changeMax}
              onChange={(e) => setChangeMax(e.target.value)}
              className="h-7 w-16 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary">Vol</span>
            <input
              type="number"
              placeholder="Min $"
              value={volMin}
              onChange={(e) => setVolMin(e.target.value)}
              className="h-7 w-24 rounded border border-border bg-bg-surface px-2 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-xs text-text-secondary">Loading screener data...</span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-card">
          <DataTable
            columns={columns}
            data={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
          <div className="border-t border-border px-2.5 py-2 text-[10px] text-text-secondary">
            {filtered.length} of {all.length} assets
          </div>
        </div>
      )}
    </div>
  );
}
