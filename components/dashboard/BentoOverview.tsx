"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { Sparkline } from "@/components/crypto/Sparkline";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { usePolling } from "@/lib/hooks/usePolling";
import type { IndexQuote, StockQuote, ForexQuote, CommodityQuote, OhlcBar } from "@/lib/api/yahoo";

type CoinMarket = { id: string; symbol: string; name: string; image: string; current_price: number; price_change_percentage_24h: number; price_change_percentage_1h_in_currency: number; price_change_percentage_7d_in_currency: number; price_change_percentage_30d_in_currency: number; price_change_percentage_1y_in_currency: number; sparkline_in_7d: { price: number[] } };

type ChartAsset = { symbol: string; type: string; label: string };

const chartAssets: ChartAsset[] = [
  { symbol: "BTC", type: "crypto", label: "BTC/USD" },
  { symbol: "ETH", type: "crypto", label: "ETH/USD" },
  { symbol: "AAPL", type: "stock", label: "AAPL" },
  { symbol: "NVDA", type: "stock", label: "NVDA" },
  { symbol: "EUR/USD", type: "forex", label: "EUR/USD" },
  { symbol: "GC", type: "commodity", label: "Gold" },
];

const timeframeTabs = [
  { label: "1H", days: "5", interval: "1h" },
  { label: "24H", days: "1" },
  { label: "7D", days: "7" },
  { label: "1M", days: "30" },
];

function fmt(n: number, d = 2) {
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(d);
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function cn(up: boolean) {
  return up ? "text-green" : "text-red";
}

export function BentoOverview({
  initialIndices = [],
  initialStocks = [],
  initialForex = [],
  initialCommodities = [],
}: {
  initialIndices?: IndexQuote[];
  initialStocks?: StockQuote[];
  initialForex?: ForexQuote[];
  initialCommodities?: CommodityQuote[];
}) {
  const [indices, setIndices] = useState<IndexQuote[]>(initialIndices);
  const [stocks, setStocks] = useState<StockQuote[]>(initialStocks);
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [forex, setForex] = useState<ForexQuote[]>(initialForex);
  const [commodities, setCommodities] = useState<CommodityQuote[]>(initialCommodities);
  const [chartData, setChartData] = useState<OhlcBar[]>([]);
  const [chartAsset, setChartAsset] = useState<ChartAsset>(chartAssets[0]);
  const [{ chartDays, chartInterval }, setChartTimeframe] = useState({ chartDays: "1", chartInterval: undefined as string | undefined });
  const [chartLoading, setChartLoading] = useState(true);
  const [loadSlow, setLoadSlow] = useState(false);

  const fetchAll = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const [i, s, c, f, cm] = await Promise.all([
        fetch("/api/stocks?type=indices", { signal: controller.signal }).then((r) => r.json()),
        fetch("/api/stocks?type=stocks", { signal: controller.signal }).then((r) => r.json()),
        fetch("/api/crypto?per_page=3", { signal: controller.signal }).then((r) => r.json()),
        fetch("/api/forex", { signal: controller.signal }).then((r) => r.json()),
        fetch("/api/commodities", { signal: controller.signal }).then((r) => r.json()),
      ]);
      if (Array.isArray(i)) setIndices(i);
      if (Array.isArray(s)) setStocks(s);
      if (Array.isArray(c)) setCoins(c);
      if (Array.isArray(f)) setForex(f);
      if (Array.isArray(cm)) setCommodities(cm);
      setLoadSlow(false);
    } catch (err) {
      console.error("BentoOverview fetchAll failed:", err);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const slowTimer = setTimeout(() => setLoadSlow(true), 8000);
    fetchAll();
    return () => clearTimeout(slowTimer);
  }, [fetchAll]);

  usePolling(fetchAll, 10000);

  const abortRef = useRef<AbortController | null>(null);

  const fetchOhlc = useCallback(async (asset: ChartAsset, days: string, interval: string | undefined, signal: AbortSignal) => {
    setChartLoading(true);
    try {
      const params = new URLSearchParams({ symbol: asset.symbol, type: asset.type, days });
      if (interval) params.set("interval", interval);
      const res = await fetch(`/api/ohlc?${params}`, { signal });
      const data = await res.json();
      if (Array.isArray(data)) setChartData(data);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("fetchOhlc failed:", err);
      }
      setChartData([]);
    }
    setChartLoading(false);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchOhlc(chartAsset, chartDays, chartInterval, controller.signal);
    return () => { controller.abort(); };
  }, [chartAsset, chartDays, chartInterval, fetchOhlc]);

  const topMovers = useMemo(() => [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)), [stocks]);
  const breadthGreen = useMemo(() => stocks.filter((s) => s.changePercent >= 0).length, [stocks]);
  const breadthRed = useMemo(() => stocks.filter((s) => s.changePercent < 0).length, [stocks]);

  const isEmpty = !indices.length && !coins.length;

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <span className="text-sm text-text-secondary">{loadSlow ? "Could not load market data" : "Loading market data…"}</span>
          {loadSlow && <p className="mt-2 text-xs text-text-secondary">Yahoo Finance may be rate-limiting requests. Try again later.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-3">
      {/* ── CANDLESTICK CHART ── sm:col-span-2 sm:row-span-2 */}
      <div className="sm:col-span-2 sm:row-span-2 flex flex-col bg-bg-primary p-0">
        <div className="flex items-center justify-between border-b border-border/20 px-4 py-2">
          <div className="flex items-center gap-1.5">
            {chartAssets.map((a) => (
              <button
                key={a.symbol}
                onClick={() => setChartAsset(a)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartAsset.symbol === a.symbol
                    ? "bg-accent/20 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {timeframeTabs.map((tf) => {
              const interval = (tf as any).interval;
              const isActive = chartDays === tf.days && chartInterval === (interval ?? undefined);
              return (
                <button
                  key={tf.label}
                  onClick={() => setChartTimeframe({ chartDays: tf.days, chartInterval: interval })}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-2">
          {chartLoading ? (
            <span className="text-sm text-text-secondary">Loading chart…</span>
          ) : chartData.length > 1 ? (
            <CandlestickChart data={chartData} />
          ) : (
            <span className="text-sm text-text-secondary">No chart data</span>
          )}
        </div>
      </div>

      {/* ── MARKET SIDEBAR ── lg:row-span-2 */}
      <div className="flex flex-col bg-bg-primary p-0 lg:row-span-2">
        <div className="px-4 pb-1 pt-3">
          <span className="section-title">Indices</span>
        </div>
        <div>
          {indices.map((idx) => {
            const up = idx.changePercent >= 0;
            return (
              <div key={idx.symbol} className="flex items-center justify-between border-b border-border/20 px-4 py-2 transition-colors hover:bg-bg-surface/40">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${up ? "bg-green" : "bg-red"}`} />
                  <span className="text-sm text-text-primary">{idx.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-sm text-text-primary">{fmt(idx.price, 2)}</span>
                  <span className={`w-20 text-right text-xs ${cn(up)}`} data-change={idx.changePercent}>{fmtPct(idx.changePercent)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-auto border-t border-border/20 px-4 py-2">
          <span className="section-title">Breadth</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-xs text-green">{breadthGreen}</span>
            <span className="text-xs text-text-secondary">/</span>
            <span className="font-mono text-xs text-red">{breadthRed}</span>
            <div className="ml-2 flex gap-0.5">
              {stocks.map((s) => (
                <span key={s.symbol} className={`h-2.5 w-2.5 rounded-sm ${s.changePercent >= 0 ? "bg-green/70" : "bg-red/70"}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 px-4 pb-1 pt-2">
          <span className="section-title">Crypto</span>
        </div>
        <div className="flex flex-col">
          {coins.slice(0, 3).map((c) => {
            const up = (c.price_change_percentage_24h ?? 0) >= 0;
            return (
              <div key={c.id} className="flex items-center justify-between border-b border-border/20 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Image src={c.image} alt="" width={16} height={16} className="rounded-full" />
                  <span className="text-sm font-medium text-text-primary">{c.symbol.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-primary">${fmt(c.current_price)}</span>
                  <span className={`w-16 text-right font-mono text-xs ${cn(up)}`}>{fmtPct(c.price_change_percentage_24h)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {coins[0]?.sparkline_in_7d?.price && (
          <div className="px-4 pb-3 pt-1">
            <Sparkline
              data={coins[0].sparkline_in_7d.price}
              color={(coins[0].price_change_percentage_24h ?? 0) >= 0 ? "#089981" : "#f23645"}
            />
          </div>
        )}
      </div>

      {/* ── TOP MOVERS ── sm:col-span-2 lg:col-span-3 */}
      <div className="sm:col-span-2 lg:col-span-3 flex flex-col bg-bg-primary p-0">
        <div className="flex items-center justify-between px-4 pb-0 pt-2">
          <span className="section-title">Top Movers</span>
          <a href="/dashboard/markets" className="text-xs text-accent">All →</a>
        </div>
        <div className="flex gap-px overflow-x-auto">
          {topMovers.slice(0, 10).map((s) => {
            const up = s.changePercent >= 0;
            const pct = Math.abs(s.changePercent);
            const barW = Math.max(8, Math.min(100, pct * 10));
            return (
              <a key={s.symbol} href={`/assets/${s.symbol}`} className="flex flex-1 flex-col items-center gap-1 border-r border-border/20 px-3 py-2 transition-colors hover:bg-bg-surface/40 last:border-r-0">
                <span className="font-mono text-xs font-medium text-text-primary">{s.symbol}</span>
                <span className={`font-mono text-xs ${cn(up)}`}>{fmtPct(s.changePercent)}</span>
                <div className="h-1.5 w-full rounded-full bg-bg-surface">
                  <div className={`h-full rounded-full ${up ? "bg-green" : "bg-red"}`} style={{ width: `${barW}%` }} />
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── FOREX / COMMODITIES ── */}
      <div className="bg-bg-primary p-0">
        <div className="flex items-center justify-between px-4 pb-0 pt-2">
          <span className="section-title">Forex</span>
          <a href="/dashboard/forex" className="text-xs text-accent">All →</a>
        </div>
        <div className="grid grid-cols-2">
          {forex.slice(0, 6).map((p) => {
            const up = p.changePercent >= 0;
            return (
              <a key={p.pair} href={`/assets/${p.pair}`} className="flex items-center justify-between border-b border-r border-border/20 px-4 py-1.5 transition-colors hover:bg-bg-surface/40">
                <span className="font-mono text-xs text-text-primary">{p.pair}</span>
                <span className={`font-mono text-xs ${cn(up)}`}>{fmtPct(p.changePercent)}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-bg-primary p-0">
        <div className="flex items-center justify-between px-4 pb-0 pt-2">
          <span className="section-title">Commodities</span>
          <a href="/dashboard/commodities" className="text-xs text-accent">All →</a>
        </div>
        <div className="grid grid-cols-2">
          {commodities.slice(0, 6).map((c) => {
            const up = c.changePercent >= 0;
            return (
              <a key={c.symbol} href={`/assets/${c.symbol}`} className="flex items-center justify-between border-b border-r border-border/20 px-4 py-1.5 transition-colors hover:bg-bg-surface/40">
                <span className="font-mono text-xs text-text-primary">{c.symbol}</span>
                <span className={`font-mono text-xs ${cn(up)}`}>{fmtPct(c.changePercent)}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="bg-bg-primary p-0">
        <div className="px-4 pb-0 pt-2">
          <span className="section-title">Pages</span>
        </div>
        <div>
          {[
            { href: "/dashboard/markets", label: "Markets" },
            { href: "/dashboard/crypto", label: "Crypto" },
            { href: "/watchlist", label: "Watchlist" },
            { href: "/portfolio", label: "Portfolio" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="flex items-center border-b border-border/20 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface/40 hover:text-text-primary">
              {link.label}
              <span className="ml-auto text-xs text-text-secondary">→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
