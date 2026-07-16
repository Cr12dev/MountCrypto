"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { buy, sell, resetAccount } from "@/lib/actions/sandbox";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { computeIndicators, scanPatterns } from "@/lib/indicators";
import type { OhlcBar } from "@/lib/api/yahoo";
import type { LimitLine } from "@/components/charts/CandlestickChart";
import type { ChangeMap } from "@/lib/api/timeframes";

type AssetType = "stock" | "crypto" | "forex" | "commodity";

type Account = {
  id: string; balance: number; created_at: string;
};

type Holding = {
  id: string; symbol: string; asset_type: AssetType;
  quantity: number; avg_price: number; created_at: string;
};

type Txn = {
  id: string; symbol: string; asset_type: AssetType;
  type: "buy" | "sell"; quantity: number; price: number; executed_at: string;
};

type PriceMap = Record<string, { price: number; change: number; changePercent: number; changes: ChangeMap }>;

const assetTypeLabels: Record<string, string> = {
  stock: "Stock", crypto: "Crypto", forex: "Forex", commodity: "Commodity",
};

const TIMEFRAMES = [
  { label: "1H", interval: "15m" },
  { label: "5H", interval: "1h" },
  { label: "24H", interval: "1h" },
  { label: "1W", interval: "1d" },
  { label: "1M", interval: "1d" },
  { label: "5M", interval: "1wk" },
  { label: "1Y", interval: "1mo" },
];

function fmtCurrency(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SandboxDashboard({ userId }: { userId: string }) {
  const supabase = createClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [loading, setLoading] = useState(true);
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [tradeType, setTradeType] = useState<AssetType>("stock");
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [trading, setTrading] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);

  // Chart state
  const [chartSymbol, setChartSymbol] = useState("");
  const [chartType, setChartType] = useState<AssetType>("stock");
  const [chartData, setChartData] = useState<OhlcBar[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [interval, setInterval] = useState("1d");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const fetchData = useCallback(async () => {
    const [acc, hld, txns] = await Promise.all([
      supabase.from("sandbox_accounts").select("*").eq("user_id", userId).single(),
      supabase.from("sandbox_holdings").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("sandbox_transactions").select("*").eq("user_id", userId).order("executed_at", { ascending: false }).limit(50),
    ]);
    if (acc.data) setAccount(acc.data as Account);
    if (hld.data) setHoldings(hld.data as Holding[]);
    if (txns.data) setTransactions(txns.data as Txn[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!holdings.length) return;
    Promise.all([
      fetch("/api/stocks?type=stocks").then((r) => r.json()).catch(() => []),
      fetch("/api/crypto?per_page=50").then((r) => r.json()).catch(() => []),
      fetch("/api/forex").then((r) => r.json()).catch(() => []),
      fetch("/api/commodities").then((r) => r.json()).catch(() => []),
    ]).then(([stocks, crypto, forex, commodities]) => {
      const map: PriceMap = {};
      for (const s of stocks) map[`stock:${s.symbol}`] = { price: s.price, change: s.change, changePercent: s.changePercent, changes: s.changes ?? {} };
      for (const c of crypto) map[`crypto:${c.symbol.toUpperCase()}`] = { price: c.current_price, change: 0, changePercent: c.price_change_percentage_24h ?? 0, changes: {} };
      for (const f of forex) map[`forex:${f.pair}`] = { price: (f.bid + f.ask) / 2, change: f.change, changePercent: f.changePercent, changes: f.changes ?? {} };
      for (const c of commodities) map[`commodity:${c.symbol}`] = { price: c.price, change: c.change, changePercent: c.changePercent, changes: c.changes ?? {} };
      setPrices(map);
    });
  }, [holdings]);

  // Sync trade form symbol to chart (debounced)
  useEffect(() => {
    if (!tradeSymbol.trim()) return;
    const timer = setTimeout(() => {
      setChartSymbol(tradeSymbol.trim().toUpperCase());
      setChartType(tradeType);
    }, 400);
    return () => clearTimeout(timer);
  }, [tradeSymbol, tradeType]);

  // Fetch OHLC for chart
  useEffect(() => {
    if (!chartSymbol) return;
    let cancelled = false;
    setChartLoading(true);
    const params = new URLSearchParams({ symbol: chartSymbol, type: chartType, days: "1825" });
    if (interval) params.set("interval", interval);
    fetch(`/api/ohlc?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setChartData(Array.isArray(json) ? json : []);
      })
      .catch(() => { if (!cancelled) setChartData([]); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [chartSymbol, chartType, interval]);

  // Set chart symbol from holding click
  function selectHolding(h: Holding) {
    setChartSymbol(h.symbol);
    setChartType(h.asset_type);
    setTradeSymbol(h.symbol);
    setTradeType(h.asset_type);
    const quote = prices[`${h.asset_type}:${h.symbol}`];
    if (quote) setTradePrice(String(quote.price));
    setError("");
  }

  // Derive limit lines from holding + stop/profit
  const limitLines: LimitLine[] = useMemo(() => {
    const lines: LimitLine[] = [];
    const quote = prices[`${chartType}:${chartSymbol}`]?.price;
    const holding = holdings.find((h) => h.symbol === chartSymbol && h.asset_type === chartType);

    if (holding) {
      lines.push({
        price: holding.avg_price,
        label: "Avg",
        color: "#5d6573",
      });
      if (quote != null) {
        const pnlPct = ((quote - holding.avg_price) / holding.avg_price) * 100;
        const pnlColor = pnlPct >= 0 ? "#089981" : "#f23645";
        lines.push({
          price: quote,
          label: pnlPct >= 0 ? `+${pnlPct.toFixed(1)}%` : `${pnlPct.toFixed(1)}%`,
          color: pnlColor,
        });
      }
    }

    if (stopLoss) {
      const sl = parseFloat(stopLoss);
      if (!isNaN(sl)) lines.push({ price: sl, label: "SL", color: "#f23645" });
    }
    if (takeProfit) {
      const tp = parseFloat(takeProfit);
      if (!isNaN(tp)) lines.push({ price: tp, label: "TP", color: "#089981" });
    }

    return lines;
  }, [holdings, chartSymbol, chartType, prices, stopLoss, takeProfit]);

  const indicators = useMemo(() => chartData.length > 0 ? computeIndicators(chartData) : undefined, [chartData]);
  const patterns = useMemo(() => chartData.length > 0 ? scanPatterns(chartData) : undefined, [chartData]);

  async function handleTrade() {
    if (!tradeSymbol.trim() || !tradeQuantity || !tradePrice) return;
    setTrading(true);
    setError("");
    try {
      const qty = parseFloat(tradeQuantity);
      const price = parseFloat(tradePrice);
      if (tradeAction === "buy") await buy(tradeSymbol.trim(), tradeType, qty, price);
      else await sell(tradeSymbol.trim(), tradeType, qty, price);
      setChartSymbol(tradeSymbol.trim().toUpperCase());
      setChartType(tradeType);
      setTradeSymbol("");
      setTradeQuantity("");
      setTradePrice("");
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    }
    setTrading(false);
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetAccount();
      await fetchData();
    } catch {}
    setResetting(false);
  }

  const totalValue = holdings.reduce((sum, h) => {
    const quote = prices[`${h.asset_type}:${h.symbol}`];
    return sum + (quote ? quote.price * h.quantity : 0);
  }, 0);
  const portfolioValue = account ? account.balance + totalValue : 0;
  const totalPnl = holdings.reduce((sum, h) => {
    const quote = prices[`${h.asset_type}:${h.symbol}`];
    return sum + (quote ? (quote.price - h.avg_price) * h.quantity : 0);
  }, 0);
  const totalPnlPct = portfolioValue > 0 ? (totalPnl / (portfolioValue - totalPnl)) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <span className="text-xs text-text-secondary">Loading sandbox...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Sandbox</h1>
          <p className="mt-0.5 text-xs text-text-secondary">
            Simulated trading with virtual money — practice without risk
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="rounded border border-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary transition-colors hover:border-red/50 hover:text-red disabled:opacity-30"
        >
          {resetting ? "Resetting..." : "Reset account"}
        </button>
      </div>

      {/* Balance cards */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Cash Balance</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
            {account ? fmtCurrency(account.balance) : "$0"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Portfolio Value</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{fmtCurrency(totalValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Total Equity</p>
          <p className="mt-1 font-mono text-lg font-semibold text-text-primary">{fmtCurrency(portfolioValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-secondary">Total P&amp;L</p>
          <p className={`mt-1 font-mono text-lg font-semibold ${totalPnl >= 0 ? "text-green" : "text-red"}`}>
            {totalPnl >= 0 ? "+" : ""}{fmtCurrency(totalPnl)}
            <span className="ml-1 text-xs">({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)</span>
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Chart area */}
        <div className="rounded-lg border border-border bg-bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              {chartSymbol ? (
                <>
                  <span className="font-mono text-xs font-semibold text-text-primary">{chartSymbol}</span>
                  <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">{assetTypeLabels[chartType]}</span>
                </>
              ) : (
                <span className="text-xs text-text-secondary">Select a holding or trade to view chart</span>
              )}
            </div>
            <div className="flex gap-0.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setInterval(tf.interval)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    interval === tf.interval
                      ? "bg-accent/15 text-accent"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-1 pt-2">
            {!chartSymbol ? (
              <div className="flex h-[320px] items-center justify-center">
                <p className="text-xs text-text-secondary">Click a holding or make a trade to see the chart</p>
              </div>
            ) : chartLoading ? (
              <div className="flex h-[320px] items-center justify-center">
                <span className="text-xs text-text-secondary">Loading chart...</span>
              </div>
            ) : chartData.length > 0 ? (
              <CandlestickChart
                data={chartData}
                height={340}
                indicators={indicators}
                patterns={patterns}
                activeIndicators={[]}
                limitLines={limitLines}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center">
                <span className="text-xs text-text-secondary">No data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Trade form */}
        <div className="rounded-lg border border-border bg-bg-card p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-secondary">Place Trade</p>
          <div className="mb-2">
            <label className="mb-0.5 block text-[10px] text-text-secondary">Action</label>
            <div className="flex gap-0.5">
              <button
                onClick={() => setTradeAction("buy")}
                className={`flex-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  tradeAction === "buy" ? "bg-green/20 text-green" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeAction("sell")}
                className={`flex-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  tradeAction === "sell" ? "bg-red/20 text-red" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Sell
              </button>
            </div>
          </div>
          <div className="mb-2">
            <label className="mb-0.5 block text-[10px] text-text-secondary">Type</label>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as AssetType)}
              className="w-full rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="commodity">Commodity</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="mb-0.5 block text-[10px] text-text-secondary">Symbol</label>
            <input
              value={tradeSymbol}
              onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div className="mb-2 flex gap-2">
            <div className="flex-1">
              <label className="mb-0.5 block text-[10px] text-text-secondary">Qty</label>
              <input
                type="number" step="any"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(e.target.value)}
                placeholder="10"
                className="w-full rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-0.5 block text-[10px] text-text-secondary">Price</label>
              <input
                type="number" step="any"
                value={tradePrice}
                onChange={(e) => setTradePrice(e.target.value)}
                placeholder="150.00"
                className="w-full rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
              />
            </div>
          </div>
          <div className="mb-2 flex gap-2">
            <div className="flex-1">
              <label className="mb-0.5 block text-[10px] text-text-secondary">Stop Loss</label>
              <input
                type="number" step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="--"
                className="w-full rounded border border-red/30 bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-red"
              />
            </div>
            <div className="flex-1">
              <label className="mb-0.5 block text-[10px] text-text-secondary">Take Profit</label>
              <input
                type="number" step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="--"
                className="w-full rounded border border-green/30 bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-green"
              />
            </div>
          </div>
          <button
            onClick={handleTrade}
            disabled={trading || !tradeSymbol || !tradeQuantity || !tradePrice}
            className={`w-full rounded px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30 ${
              tradeAction === "buy" ? "bg-green" : "bg-red"
            }`}
          >
            {trading ? "Trading..." : tradeAction === "buy" ? "Buy" : "Sell"}
          </button>
          {error && <p className="mt-2 text-xs text-red">{error}</p>}
        </div>
      </div>

      {/* Holdings + Transactions */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-bg-card">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Holdings</p>
          </div>
          {holdings.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-text-secondary">No holdings yet. Start trading!</p>
          ) : (
            <div>
              {holdings.map((h) => {
                const key = `${h.asset_type}:${h.symbol}`;
                const quote = prices[key];
                const currentPrice = quote?.price ?? h.avg_price;
                const marketValue = currentPrice * h.quantity;
                const pnl = (currentPrice - h.avg_price) * h.quantity;
                const pnlPct = ((currentPrice - h.avg_price) / h.avg_price) * 100;
                const up = pnl >= 0;
                return (
                  <div
                    key={h.id}
                    onClick={() => selectHolding(h)}
                    className={`flex cursor-pointer items-center justify-between border-b border-border/20 px-3 py-2 last:border-0 transition-colors ${
                      chartSymbol === h.symbol && chartType === h.asset_type
                        ? "bg-accent/5"
                        : "hover:bg-bg-hover/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                        {assetTypeLabels[h.asset_type]}
                      </span>
                      <span className="font-mono text-xs font-medium text-text-primary">{h.symbol}</span>
                      <span className="font-mono text-[10px] text-text-secondary">{h.quantity} @ {fmtCurrency(h.avg_price)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-text-primary">{fmtCurrency(marketValue)}</span>
                      <span className={`w-20 text-right font-mono text-xs ${up ? "text-green" : "text-red"}`}>
                        {up ? "+" : ""}{fmtCurrency(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-card">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Recent Trades</p>
          </div>
          {transactions.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-text-secondary">No trades yet</p>
          ) : (
            <div>
              {transactions.slice(0, 20).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border-b border-border/20 px-3 py-1.5 last:border-0 hover:bg-bg-hover/20"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1 py-0.5 font-mono text-[10px] text-white ${
                      t.type === "buy" ? "bg-green/70" : "bg-red/70"
                    }`}>
                      {t.type === "buy" ? "B" : "S"}
                    </span>
                    <span className="font-mono text-xs text-text-primary">{t.symbol}</span>
                    <span className="font-mono text-[10px] text-text-secondary">{t.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-text-secondary">{fmtCurrency(t.price)}</span>
                    <span className="font-mono text-[10px] text-text-secondary">
                      {new Date(t.executed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
