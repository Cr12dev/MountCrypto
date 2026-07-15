"use client";

import { useState, useEffect, useCallback } from "react";
import { PredictionChart } from "./PredictionChart";

type CoinInfo = { id: string; symbol: string; name: string };
type PredictionPoint = { date: string; predicted_price: number; upper_bound: number; lower_bound: number };
type FactorWeight = { name: string; weight: number; impact: string };
type Sentiment = { score: number; label: string; article_count: number; recent_trend: string };
type ModelMetric = { model: string; mae: number; rmse: number; weight: number };
type Prediction = {
  coin_id: string; symbol: string; name: string;
  current_price: number; current_date: string;
  forecast: PredictionPoint[];
  factors: FactorWeight[];
  sentiment: Sentiment;
  confidence: string;
  model_metrics: ModelMetric[];
  prediction_days: number;
};

const DAYS_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "14D", value: "14" },
  { label: "30D", value: "30" },
  { label: "60D", value: "60" },
  { label: "90D", value: "90" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PredictionDashboard() {
  const [coins, setCoins] = useState<CoinInfo[]>([]);
  const [selected, setSelected] = useState("bitcoin");
  const [days, setDays] = useState("30");
  const [chartType, setChartType] = useState<"area" | "line" | "scatter">("area");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/predict/coins")
      .then((r) => r.json())
      .then((d) => setCoins(d.coins ?? []))
      .catch(() => {});
  }, []);

  const fetchPrediction = useCallback(async (coinId: string, d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/predict/${coinId}?days=${d}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prediction");
      setPrediction(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrediction(selected, days);
  }, [selected, days, fetchPrediction]);

  const coinInfo = coins.find((c) => c.id === selected);
  const isUp = prediction ? prediction.forecast[prediction.forecast.length - 1]?.predicted_price >= prediction.current_price : true;
  const change = prediction && prediction.forecast.length > 0
    ? ((prediction.forecast[prediction.forecast.length - 1].predicted_price - prediction.current_price) / prediction.current_price * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4">
        <h1 className="text-base font-semibold text-text-primary">Price Predictor</h1>
        <p className="mt-0.5 text-xs text-text-secondary">
          Multi-model ensemble forecast based on price history, news sentiment, and market factors
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(coins.length > 0 ? coins : [
            { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
            { id: "ethereum", symbol: "ETH", name: "Ethereum" },
            { id: "litecoin", symbol: "LTC", name: "Litecoin" },
            { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
            { id: "tether", symbol: "USDT", name: "Tether" },
            { id: "binancecoin", symbol: "BNB", name: "BNB" },
            { id: "ripple", symbol: "XRP", name: "XRP" },
            { id: "solana", symbol: "SOL", name: "Solana" },
            { id: "monero", symbol: "XMR", name: "Monero" },
          ]).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                selected === c.id
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {c.symbol}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                days === opt.value
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red/30 bg-red/10 px-4 py-3">
          <p className="text-xs text-red">{error}</p>
        </div>
      )}

      {loading && !prediction && (
        <div className="flex h-[400px] items-center justify-center">
          <span className="text-xs text-text-secondary">Loading prediction...</span>
        </div>
      )}

      {prediction && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-border bg-bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {prediction.name}
                </span>
                <span className="font-mono text-xs uppercase text-text-secondary">{prediction.symbol}</span>
                <span className="ml-2 font-mono text-sm text-text-primary">
                  ${fmt(prediction.current_price)}
                </span>
                <span className={`font-mono text-xs ${isUp ? "text-green" : "text-red"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                </span>
                <span className="ml-2 rounded bg-bg-hover px-1.5 py-0.5 font-mono text-[10px] uppercase text-text-secondary">
                  {prediction.confidence} confidence
                </span>
              </div>
              <div className="flex gap-1">
                {(["area", "line", "scatter"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      chartType === t
                        ? "bg-accent/20 text-accent"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    {t === "area" ? "Area" : t === "line" ? "Line" : "Scatter"}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2">
              <PredictionChart data={prediction.forecast} chartType={chartType} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-bg-card">
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Factors</p>
              </div>
              <div className="divide-y divide-border/50">
                {prediction.factors.map((f) => (
                  <div key={f.name} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        f.impact === "positive" ? "bg-green" : f.impact === "negative" ? "bg-red" : "bg-text-secondary"
                      }`} />
                      <span className="text-xs text-text-secondary">{f.name}</span>
                    </div>
                    <span className="font-mono text-xs text-text-primary">{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-card">
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Sentiment</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Score</span>
                  <span className={`font-mono text-xs font-medium ${
                    prediction.sentiment.label === "bullish" ? "text-green" : prediction.sentiment.label === "bearish" ? "text-red" : "text-text-primary"
                  }`}>
                    {prediction.sentiment.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Articles</span>
                  <span className="font-mono text-xs text-text-primary">{prediction.sentiment.article_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Trend</span>
                  <span className="font-mono text-xs text-text-primary">{prediction.sentiment.recent_trend}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-card">
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Models</p>
              </div>
              <div className="divide-y divide-border/50">
                {prediction.model_metrics.map((m) => (
                  <div key={m.model} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-text-secondary">{m.model}</span>
                    <span className="font-mono text-xs text-text-primary">{(m.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
