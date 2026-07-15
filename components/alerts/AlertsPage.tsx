"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAlert, deleteAlert, toggleAlertTriggered } from "@/lib/actions/alerts";
import { AdvancedAlertsForm } from "@/components/alerts/AdvancedAlertsForm";

type Alert = {
  id: string;
  symbol: string;
  asset_type: string;
  target_price: number;
  direction: "above" | "below";
  triggered: boolean;
  created_at: string;
};

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

export function AlertsPage({ userId }: { userId: string }) {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState("crypto");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setAlerts(data as Alert[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleCreate() {
    if (!symbol.trim() || !targetPrice) return;
    setCreating(true);
    try {
      await createAlert(symbol.trim(), assetType, parseFloat(targetPrice), direction);
      setSymbol("");
      setTargetPrice("");
      setShowForm(false);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteAlert(id);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleAlertTriggered(id, !current);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  const [tab, setTab] = useState<"price" | "indicator">("price");

  return (
    <div className="p-4 md:p-6">
      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-border">
        <button
          onClick={() => setTab("price")}
          className={`pb-2 text-xs font-medium uppercase tracking-wider transition-colors ${
            tab === "price"
              ? "border-b-2 border-accent text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Price Alerts
        </button>
        <button
          onClick={() => setTab("indicator")}
          className={`pb-2 text-xs font-medium uppercase tracking-wider transition-colors ${
            tab === "indicator"
              ? "border-b-2 border-accent text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Technical Alerts
        </button>
      </div>

      {tab === "price" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="title-sm">Price Alerts</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
            >
              + New alert
            </button>
          </div>

          {showForm && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-card/30 p-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                >
                  <option value="crypto">Crypto</option>
                  <option value="stock">Stock</option>
                  <option value="forex">Forex</option>
                  <option value="commodity">Commodity</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Symbol</label>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="BTC"
                  className="w-24 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as "above" | "below")}
                  className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                >
                  <option value="above">Price above</option>
                  <option value="below">Price below</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Target price</label>
                <input
                  type="number"
                  step="any"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-28 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !symbol || !targetPrice}
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-text-secondary">Loading alerts…</p>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
              <p className="text-sm font-medium text-text-secondary">No alerts yet</p>
              <p className="mt-1 text-xs text-text-secondary">Create an alert to get notified when price moves</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg-card/30">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-border/20 px-3 py-2 last:border-0 hover:bg-bg-hover/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary">{assetTypeLabels[a.asset_type]}</span>
                    <span className="font-mono text-xs font-medium text-text-primary">{a.symbol}</span>
                    <span className={`font-mono text-xs ${a.direction === "above" ? "text-green" : "text-red"}`}>
                      {a.direction === "above" ? "↑" : "↓"} ${fmtPrice(a.target_price, a.asset_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(a.id, a.triggered)}
                      className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                        a.triggered
                          ? "bg-green/20 text-green"
                          : "bg-bg-hover text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {a.triggered ? "Triggered" : "Active"}
                    </button>
                    <span className="text-xs text-text-secondary">{new Date(a.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-xs text-text-secondary transition-colors hover:text-red"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "indicator" && <AdvancedAlertsForm userId={userId} />}
    </div>
  );
}
