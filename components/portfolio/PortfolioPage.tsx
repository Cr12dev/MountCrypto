"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createHolding, deleteHolding, addTransaction, deleteTransaction } from "@/lib/actions/portfolio";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import type { ChangeMap } from "@/lib/api/timeframes";

type AssetType = "stock" | "crypto" | "forex" | "commodity";

type Holding = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  avg_price: number;
  created_at: string;
  transactions: {
    id: string;
    type: "buy" | "sell";
    quantity: number;
    price: number;
    executed_at: string;
  }[];
};

type PriceMap = Record<string, { price: number; change: number; changePercent: number; changes: ChangeMap }>;

const assetTypeLabels: Record<string, string> = {
  stock: "Stock",
  crypto: "Crypto",
  forex: "Forex",
  commodity: "Commodity",
};

function fmtPrice(n: number, type: string) {
  if (type === "crypto") {
    if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  if (n >= 100) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function fmtCurrency(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PortfolioPage({ userId }: { userId: string }) {
  const supabase = createClient();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<PriceMap>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSymbol, setAddSymbol] = useState("");
  const [addType, setAddType] = useState<AssetType>("stock");
  const [addQuantity, setAddQuantity] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);
  const [txHolding, setTxHolding] = useState<string | null>(null);
  const [txType, setTxType] = useState<"buy" | "sell">("buy");
  const [txQuantity, setTxQuantity] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [addingTx, setAddingTx] = useState(false);

  const fetchHoldings = useCallback(async () => {
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*, transactions:portfolio_transactions(order by executed_at desc)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setHoldings(data as unknown as Holding[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  useEffect(() => {
    if (!holdings.length) return;

    const types = new Set(holdings.map((h) => h.asset_type));
    if (!types.size) return;

    Promise.all([
      types.has("stock") ? fetch("/api/stocks?type=stocks").then((r) => r.json()).catch(() => []) : [],
      types.has("crypto") ? fetch("/api/crypto?per_page=50").then((r) => r.json()).catch(() => []) : [],
      types.has("forex") ? fetch("/api/forex").then((r) => r.json()).catch(() => []) : [],
      types.has("commodity") ? fetch("/api/commodities").then((r) => r.json()).catch(() => []) : [],
    ]).then(([stocks, crypto, forex, commodities]) => {
      const map: PriceMap = {};
      for (const s of stocks) map[`stock:${s.symbol}`] = { price: s.price, change: s.change, changePercent: s.changePercent, changes: s.changes ?? {} };
      for (const c of crypto) map[`crypto:${c.symbol.toUpperCase()}`] = { price: c.current_price, change: 0, changePercent: c.price_change_percentage_24h ?? 0, changes: { "1h": c.price_change_percentage_1h_in_currency, "1d": c.price_change_percentage_24h, "7d": c.price_change_percentage_7d_in_currency, "28d": c.price_change_percentage_30d_in_currency, "1y": c.price_change_percentage_1y_in_currency } };
      for (const f of forex) map[`forex:${f.pair}`] = { price: (f.bid + f.ask) / 2, change: f.change, changePercent: f.changePercent, changes: f.changes ?? {} };
      for (const c of commodities) map[`commodity:${c.symbol}`] = { price: c.price, change: c.change, changePercent: c.changePercent, changes: c.changes ?? {} };
      setPrices(map);
    });
  }, [holdings]);

  async function handleCreateHolding() {
    if (!addSymbol.trim() || !addQuantity || !addPrice) return;
    setAdding(true);
    try {
      await createHolding(addSymbol.trim(), addType, parseFloat(addQuantity), parseFloat(addPrice));
      setAddSymbol("");
      setAddQuantity("");
      setAddPrice("");
      setShowAddForm(false);
      await fetchHoldings();
    } catch (e) {
      console.error(e);
    }
    setAdding(false);
  }

  async function handleDeleteHolding(id: string) {
    try {
      await deleteHolding(id);
      await fetchHoldings();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddTx(holdingId: string) {
    if (!txQuantity || !txPrice) return;
    setAddingTx(true);
    try {
      await addTransaction(holdingId, txType, parseFloat(txQuantity), parseFloat(txPrice));
      setTxQuantity("");
      setTxPrice("");
      setTxHolding(null);
      await fetchHoldings();
    } catch (e) {
      console.error(e);
    }
    setAddingTx(false);
  }

  async function handleDeleteTx(txId: string) {
    try {
      await deleteTransaction(txId);
      await fetchHoldings();
    } catch (e) {
      console.error(e);
    }
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);
  const currentValue = holdings.reduce((sum, h) => {
    const key = `${h.asset_type}:${h.symbol}`;
    const quote = prices[key];
    return sum + (quote ? quote.price * h.quantity : 0);
  }, 0);
  const totalPL = currentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="title-sm">Portfolio</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
        >
          + Add holding
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-card/30 p-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Type</label>
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as AssetType)}
              className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
              <option value="commodity">Commodity</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Symbol</label>
            <input
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              placeholder="BTC"
              className="w-24 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Qty</label>
            <input
              type="number"
              step="any"
              value={addQuantity}
              onChange={(e) => setAddQuantity(e.target.value)}
              placeholder="0.00"
              className="w-24 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Avg price</label>
            <input
              type="number"
              step="any"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder="0.00"
              className="w-28 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <button
            onClick={handleCreateHolding}
            disabled={adding || !addSymbol || !addQuantity || !addPrice}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button onClick={() => setShowAddForm(false)} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
        </div>
      )}

      {holdings.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
            <div className="rounded-lg border border-border bg-bg-card/30 p-3">
              <p className="text-xs uppercase tracking-wider text-text-secondary">Invested</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-primary">{fmtCurrency(totalInvested)}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card/30 p-3">
              <p className="text-xs uppercase tracking-wider text-text-secondary">Value</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-primary">{fmtCurrency(currentValue)}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card/30 p-3">
              <p className="text-xs uppercase tracking-wider text-text-secondary">P&amp;L</p>
              <p className={`mt-1 font-mono text-sm font-semibold ${totalPL >= 0 ? "text-green" : "text-red"}`}>
                {totalPL >= 0 ? "+" : ""}{fmtCurrency(totalPL)}
                <span className="ml-1 text-xs">({totalPLPercent >= 0 ? "+" : ""}{totalPLPercent.toFixed(2)}%)</span>
              </p>
            </div>
            <button
              onClick={() => {
                const rows = holdings.map((h) => {
                  const key = `${h.asset_type}:${h.symbol}`;
                  const q = prices[key];
                  const cur = q ? q.price : 0;
                  return `${h.symbol},${h.asset_type},${h.quantity},${h.avg_price},${cur},${cur * h.quantity},${(cur * h.quantity) - (h.avg_price * h.quantity)}`;
                });
                const csv = "Symbol,Type,Qty,Avg Price,Current Price,Value,P&L\n" + rows.join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="self-end rounded border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
            >
              Export CSV
            </button>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-border bg-bg-card/30 p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-text-secondary">Allocation</p>
              <AllocationChart
                holdings={holdings.map((h) => {
                  const key = `${h.asset_type}:${h.symbol}`;
                  const q = prices[key];
                  return { symbol: h.symbol, value: q ? q.price * h.quantity : 0, asset_type: h.asset_type };
                })}
              />
            </div>
            <div className="rounded-lg border border-border bg-bg-card/30 p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-text-secondary">Asset types</p>
              <div className="space-y-1">
                {(["stock", "crypto", "forex", "commodity"] as const).map((type) => {
                  const total = holdings.filter((h) => h.asset_type === type).reduce((s, h) => {
                    const key = `${h.asset_type}:${h.symbol}`;
                    const q = prices[key];
                    return s + (q ? q.price * h.quantity : 0);
                  }, 0);
                  if (!total) return null;
                  const pct = currentValue > 0 ? (total / currentValue) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary capitalize">{type}</span>
                      <span className="font-mono text-xs text-text-primary">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <p className="text-xs text-text-secondary">Loading holdings…</p>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm font-medium text-text-secondary">No holdings yet</p>
          <p className="mt-1 text-xs text-text-secondary">Add your first holding to start tracking your portfolio</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-card/30">
          <div className="grid grid-cols-[1fr_80px_90px_90px_100px_36px] gap-2 border-b border-border/30 px-3 py-2 text-xs uppercase tracking-wider text-text-secondary">
            <span>Name</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Avg</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
            <span />
          </div>

          {holdings.map((h) => {
            const key = `${h.asset_type}:${h.symbol}`;
            const quote = prices[key];
            const currentPrice = quote ? quote.price : 0;
            const holdingValue = currentPrice * h.quantity;
            const costBasis = h.avg_price * h.quantity;
            const pl = holdingValue - costBasis;
            const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
            const isExpanded = expandedHolding === h.id;

            return (
              <div key={h.id}>
                <div className="grid grid-cols-[1fr_80px_90px_90px_100px_36px] items-center gap-2 border-b border-border/20 px-3 py-2 last:border-0 hover:bg-bg-hover/20">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedHolding(isExpanded ? null : h.id)}
                      className="text-xs text-text-secondary transition-transform hover:text-text-primary"
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                    <span className="font-mono text-xs font-medium text-text-primary">{h.symbol}</span>
                    <span className="text-xs text-text-secondary">{assetTypeLabels[h.asset_type]}</span>
                  </div>
                  <span className="text-right font-mono text-xs text-text-primary">{h.quantity}</span>
                  <span className="text-right font-mono text-xs text-text-secondary">${fmtPrice(h.avg_price, h.asset_type)}</span>
                  <span className="text-right font-mono text-xs text-text-primary">
                    {quote ? `$${fmtPrice(currentPrice, h.asset_type)}` : "—"}
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-xs text-text-primary">{quote ? fmtCurrency(holdingValue) : "—"}</span>
                    {quote && (
                      <div className={`text-xs ${pl >= 0 ? "text-green" : "text-red"}`}>
                        {pl >= 0 ? "+" : ""}{fmtCurrency(pl)} ({plPercent >= 0 ? "+" : ""}{plPercent.toFixed(2)}%)
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteHolding(h.id)}
                    className="text-xs text-text-secondary transition-colors hover:text-red"
                  >
                    ×
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-b border-border/20 bg-bg-surface/30 px-6 py-2">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-xs font-medium text-text-secondary">Transactions</p>
                      <button
                        onClick={() => setTxHolding(txHolding === h.id ? null : h.id)}
                        className="rounded border border-border px-1.5 py-0.5 text-xs text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
                      >
                        + Add
                      </button>
                    </div>

                    {txHolding === h.id && (
                      <div className="mb-2 flex flex-wrap items-end gap-2">
                        <select
                          value={txType}
                          onChange={(e) => setTxType(e.target.value as "buy" | "sell")}
                          className="rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none focus:border-accent"
                        >
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                        <input
                          type="number"
                          step="any"
                          value={txQuantity}
                          onChange={(e) => setTxQuantity(e.target.value)}
                          placeholder="Qty"
                          className="w-20 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                        />
                        <input
                          type="number"
                          step="any"
                          value={txPrice}
                          onChange={(e) => setTxPrice(e.target.value)}
                          placeholder="Price"
                          className="w-24 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                        />
                        <button
                          onClick={() => handleAddTx(h.id)}
                          disabled={addingTx || !txQuantity || !txPrice}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
                        >
                          {addingTx ? "…" : "Save"}
                        </button>
                        <button onClick={() => setTxHolding(null)} className="text-xs text-text-secondary">Cancel</button>
                      </div>
                    )}

                    {h.transactions.length === 0 ? (
                      <p className="text-xs text-text-secondary">No transactions recorded</p>
                    ) : (
                      <div className="text-xs">
                        {h.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-3">
                              <span className={`font-mono ${tx.type === "buy" ? "text-green" : "text-red"}`}>
                                {tx.type.toUpperCase()}
                              </span>
                              <span className="font-mono text-text-primary">{tx.quantity}</span>
                              <span className="font-mono text-text-secondary">@ ${fmtPrice(tx.price, h.asset_type)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-text-secondary">{new Date(tx.executed_at).toLocaleDateString()}</span>
                              <button
                                onClick={() => handleDeleteTx(tx.id)}
                                className="text-text-secondary transition-colors hover:text-red"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
