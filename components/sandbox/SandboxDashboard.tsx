"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { buy, sell, resetAccount } from "@/lib/actions/sandbox";
import type { ChangeMap } from "@/lib/api/timeframes";

type AssetType = "stock" | "crypto" | "forex" | "commodity";

type Account = {
  id: string;
  balance: number;
  created_at: string;
};

type Holding = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  avg_price: number;
  created_at: string;
};

type Txn = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  executed_at: string;
};

type PriceMap = Record<string, { price: number; change: number; changePercent: number; changes: ChangeMap }>;

const assetTypeLabels: Record<string, string> = {
  stock: "Stock", crypto: "Crypto", forex: "Forex", commodity: "Commodity",
};

function fmtCurrency(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(n: number, type: string) {
  if (type === "crypto") {
    if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  if (n >= 100) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!holdings.length) return;
    const symbols = holdings.map((h) => `${h.asset_type}:${h.symbol}`);

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

  async function handleTrade() {
    if (!tradeSymbol.trim() || !tradeQuantity || !tradePrice) return;
    setTrading(true);
    setError("");
    try {
      const qty = parseFloat(tradeQuantity);
      const price = parseFloat(tradePrice);
      if (tradeAction === "buy") {
        await buy(tradeSymbol.trim(), tradeType, qty, price);
      } else {
        await sell(tradeSymbol.trim(), tradeType, qty, price);
      }
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

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <span className="text-xs text-text-secondary">Loading sandbox...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
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
      <div className="mb-4 grid grid-cols-3 gap-3">
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
      </div>

      {/* Trade form */}
      <div className="mb-4 rounded-lg border border-border bg-bg-card p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-secondary">Place Trade</p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-0.5 block text-[10px] text-text-secondary">Action</label>
            <div className="flex gap-0.5">
              <button
                onClick={() => setTradeAction("buy")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  tradeAction === "buy" ? "bg-green/20 text-green" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeAction("sell")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  tradeAction === "sell" ? "bg-red/20 text-red" : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Sell
              </button>
            </div>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-text-secondary">Type</label>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as AssetType)}
              className="rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="commodity">Commodity</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-text-secondary">Symbol</label>
            <input
              value={tradeSymbol}
              onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-20 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-text-secondary">Qty</label>
            <input
              type="number"
              step="any"
              value={tradeQuantity}
              onChange={(e) => setTradeQuantity(e.target.value)}
              placeholder="10"
              className="w-20 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-text-secondary">Price</label>
            <input
              type="number"
              step="any"
              value={tradePrice}
              onChange={(e) => setTradePrice(e.target.value)}
              placeholder="150.00"
              className="w-24 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <button
            onClick={handleTrade}
            disabled={trading || !tradeSymbol || !tradeQuantity || !tradePrice}
            className={`rounded px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30 ${
              tradeAction === "buy" ? "bg-green" : "bg-red"
            }`}
          >
            {trading ? "Trading..." : tradeAction === "buy" ? "Buy" : "Sell"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red">{error}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Holdings */}
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
                    className="flex items-center justify-between border-b border-border/20 px-3 py-2 last:border-0 hover:bg-bg-hover/20"
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

        {/* Recent transactions */}
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
