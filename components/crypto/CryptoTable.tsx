"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import type { CoinMarket } from "@/lib/api/coingecko";
import { DataTable } from "@/components/ui/DataTable";
import { ChangeCell } from "@/components/ui/ChangeCell";
import { usePolling } from "@/lib/hooks/usePolling";
import { Sparkline } from "./Sparkline";

function formatPrice(n: number) {
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

function formatCompact(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

type SortKey = "market_cap_rank" | "current_price" | "price_change_percentage_1h_in_currency" | "price_change_percentage_24h" | "price_change_percentage_7d_in_currency" | "price_change_percentage_30d_in_currency" | "price_change_percentage_1y_in_currency" | "market_cap" | "total_volume";

const timeframeKeys: { key: keyof CoinMarket; label: string }[] = [
  { key: "price_change_percentage_1h_in_currency", label: "1h" },
  { key: "price_change_percentage_24h", label: "1d" },
  { key: "price_change_percentage_7d_in_currency", label: "7d" },
  { key: "price_change_percentage_30d_in_currency", label: "28d" },
  { key: "price_change_percentage_1y_in_currency", label: "1y" },
];

export function CryptoTable({ coins: initial }: { coins: CoinMarket[] }) {
  const [coins, setCoins] = useState<CoinMarket[]>(initial);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap_rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const fetchCoins = useCallback(() => {
    fetch("/api/crypto?per_page=100")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCoins(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchCoins(); }, [fetchCoins]);
  usePolling(fetchCoins, 10000);

  const filtered = useMemo(() => {
    if (!query.trim()) return coins;
    const q = query.toLowerCase();
    return coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [coins, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const perPage = 25;
  const totalPages = Math.ceil(sorted.length / perPage);
  const pageCoins = sorted.slice(page * perPage, (page + 1) * perPage);

  function toggleSort(key: string) {
    const k = key as SortKey;
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="title-sm">Cryptocurrencies</h1>
          <span className="text-xs text-text-secondary">Top {coins.length}</span>
        </div>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search coin..."
          className="w-48 rounded border border-border bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-accent"
        />
      </div>

      <DataTable
        columns={[
          {
            key: "market_cap_rank", label: "#", sortable: true,
            render: (c: CoinMarket) => <span className="font-mono text-xs text-text-secondary">{c.market_cap_rank}</span>,
          },
          {
            key: "name", label: "Coin",
            render: (c: CoinMarket) => (
              <a href={`/assets/${c.id}`} className="flex items-center gap-2">
                <Image src={c.image} alt="" width={18} height={18} className="rounded-full" />
                <span className="text-xs font-medium text-text-primary">{c.name}</span>
                <span className="font-mono text-xs uppercase text-text-secondary">{c.symbol}</span>
              </a>
            ),
          },
          {
            key: "current_price", label: "Price", sortable: true,
            render: (c: CoinMarket) => <span className="font-mono text-xs text-text-primary">${formatPrice(c.current_price)}</span>,
          },
          ...timeframeKeys.map((tf) => ({
            key: tf.key, label: tf.label, sortable: true,
            render: (c: CoinMarket) => <ChangeCell value={(c[tf.key] as number) ?? null} />,
          })),
          {
            key: "market_cap", label: "Mkt Cap", sortable: true, hide: "sm" as const,
            render: (c: CoinMarket) => <span className="font-mono text-xs text-text-primary">{formatCompact(c.market_cap)}</span>,
          },
          {
            key: "total_volume", label: "Volume", sortable: true, hide: "md" as const,
            render: (c: CoinMarket) => <span className="font-mono text-xs text-text-secondary">{formatCompact(c.total_volume)}</span>,
          },
          {
            key: "sparkline", label: "7D", hide: "lg" as const,
            render: (c: CoinMarket) => c.sparkline_in_7d?.price
              ? <Sparkline data={c.sparkline_in_7d.price} color={(c.price_change_percentage_24h ?? 0) >= 0 ? "#089981" : "#f23645"} />
              : null,
          },
        ]}
        data={pageCoins}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
      />

          {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-gray-500 disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-mono text-xs text-text-secondary">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-gray-500 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
