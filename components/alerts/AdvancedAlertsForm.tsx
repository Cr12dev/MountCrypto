"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createIndicatorAlert,
  deleteIndicatorAlert,
  toggleIndicatorAlertTriggered,
} from "@/lib/actions/indicator-alerts";
import type { IndicatorType, IndicatorCondition, IndicatorAlertRow } from "@/lib/actions/indicator-alerts";

const INDICATOR_LABELS: Record<IndicatorType, string> = {
  rsi: "RSI (14)",
  macd_cross: "MACD Cross",
  bollinger: "Bollinger Breakout",
  sma_cross: "SMA Cross (20/50)",
  ema_cross: "EMA Cross (12/26)",
  volatility_spike: "Volatility Spike",
  volume_spike: "Volume Spike",
  consecutive: "Consecutive Candles",
  bb_width: "BB Width",
};

const INDICATOR_OPTIONS = Object.entries(INDICATOR_LABELS).map(([k, v]) => ({
  value: k as IndicatorType,
  label: v,
}));

type ConditionOption = { value: IndicatorCondition; label: string };

function getConditions(type: IndicatorType): ConditionOption[] {
  switch (type) {
    case "rsi":
    case "volatility_spike":
    case "bb_width":
      return [
        { value: "above", label: "Above" },
        { value: "below", label: "Below" },
      ];
    case "macd_cross":
    case "sma_cross":
    case "ema_cross":
      return [
        { value: "cross_above", label: "Cross Above (Bullish)" },
        { value: "cross_below", label: "Cross Below (Bearish)" },
      ];
    case "bollinger":
      return [
        { value: "above", label: "Price Above Upper Band" },
        { value: "below", label: "Price Below Lower Band" },
      ];
    case "volume_spike":
      return [
        { value: "above", label: "Volume > N× SMA" },
        { value: "below", label: "Volume < N× SMA" },
      ];
    case "consecutive":
      return [
        { value: "above", label: "Consecutive Gains" },
        { value: "below", label: "Consecutive Losses" },
      ];
  }
}

function getValueLabel(type: IndicatorType): string {
  switch (type) {
    case "rsi": return "RSI threshold (0–100)";
    case "volatility_spike": return "Annualised volatility threshold";
    case "bb_width": return "BB width threshold";
    case "volume_spike": return "Volume multiplier (e.g., 2 = 2× SMA)";
    case "consecutive": return "Number of consecutive candles";
    default: return "Threshold value";
  }
}

function getValuePlaceholder(type: IndicatorType): string {
  switch (type) {
    case "rsi": return "70";
    case "volatility_spike": return "0.5";
    case "bb_width": return "5";
    case "volume_spike": return "2";
    case "consecutive": return "3";
    default: return "0";
  }
}

function getValueStep(type: IndicatorType): string {
  if (type === "consecutive") return "1";
  return "any";
}

function needsValue(type: IndicatorType): boolean {
  return !["macd_cross", "bollinger", "sma_cross", "ema_cross"].includes(type);
}

const TIMEFRAMES = [
  { value: "1d", label: "1 Day" },
  { value: "1h", label: "1 Hour" },
  { value: "1w", label: "1 Week" },
];

const assetTypeLabels: Record<string, string> = {
  stock: "Stock", crypto: "Crypto", forex: "Forex", commodity: "Commodity",
};

const indicatorLabels: Record<string, string> = INDICATOR_LABELS;

const conditionLabels: Record<string, Record<string, string>> = {
  rsi: { above: ">", below: "<" },
  volatility_spike: { above: ">", below: "<" },
  bb_width: { above: ">", below: "<" },
  macd_cross: { cross_above: "Bullish", cross_below: "Bearish" },
  sma_cross: { cross_above: "Golden", cross_below: "Death" },
  ema_cross: { cross_above: "Bullish", cross_below: "Bearish" },
  bollinger: { above: "Above Upper", below: "Below Lower" },
  volume_spike: { above: ">", below: "<" },
  consecutive: { above: "Gains", below: "Losses" },
};

export function AdvancedAlertsForm({ userId }: { userId: string }) {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<IndicatorAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState("crypto");
  const [indicatorType, setIndicatorType] = useState<IndicatorType>("rsi");
  const [condition, setCondition] = useState<IndicatorCondition>("above");
  const [value, setValue] = useState("");
  const [timeframe, setTimeframe] = useState("1d");
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from("indicator_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setAlerts(data as IndicatorAlertRow[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const conds = getConditions(indicatorType);
    if (!conds.find((c) => c.value === condition)) {
      setCondition(conds[0].value);
    }
  }, [indicatorType, condition]);

  async function handleCreate() {
    if (!symbol.trim()) return;
    if (needsValue(indicatorType) && !value) return;
    setCreating(true);
    try {
      await createIndicatorAlert(
        symbol.trim(),
        assetType,
        indicatorType,
        condition,
        needsValue(indicatorType) ? parseFloat(value) : 0,
        timeframe,
      );
      setSymbol("");
      setValue("");
      setShowForm(false);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteIndicatorAlert(id);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleIndicatorAlertTriggered(id, !current);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="border-t border-border/20 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Technical Alerts
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
        >
          + New
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
              className="w-20 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Indicator</label>
            <select
              value={indicatorType}
              onChange={(e) => setIndicatorType(e.target.value as IndicatorType)}
              className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              {INDICATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as IndicatorCondition)}
              className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              {getConditions(indicatorType).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {needsValue(indicatorType) && (
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Value</label>
              <input
                type="number"
                step={getValueStep(indicatorType)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getValuePlaceholder(indicatorType)}
                className="w-24 rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded border border-border bg-bg-surface px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !symbol || (needsValue(indicatorType) && !value)}
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <p className="text-sm font-medium text-text-secondary">No technical alerts</p>
          <p className="mt-1 text-xs text-text-secondary">Get notified on RSI, MACD cross, Bollinger breaks, and more</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-card/30">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-b border-border/20 px-3 py-2 last:border-0 hover:bg-bg-hover/20"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-bg-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                  {assetTypeLabels[a.asset_type] || a.asset_type}
                </span>
                <span className="font-mono text-xs font-medium text-text-primary">{a.symbol}</span>
                <span className="text-xs text-text-secondary">{indicatorLabels[a.indicator_type] || a.indicator_type}</span>
                <span className="font-mono text-xs text-text-secondary">
                  {conditionLabels[a.indicator_type]?.[a.condition] ?? a.condition}
                  {needsValue(a.indicator_type as IndicatorType) ? ` ${a.value}` : ""}
                </span>
                <span className="rounded bg-bg-hover px-1 font-mono text-[10px] text-text-secondary">
                  {a.timeframe}
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
    </div>
  );
}
