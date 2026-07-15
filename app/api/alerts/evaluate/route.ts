import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchOhlc } from "@/lib/api/yahoo";
import {
  computeRsi,
  computeMacd,
  computeBollinger,
  computeSma,
  computeEma,
  computeVolatility,
  computeVolumeSma,
} from "@/lib/indicators";

const MAP: Record<string, string> = {
  "BTC-USD": "BTC", "ETH-USD": "ETH", "SOL-USD": "SOL",
  "XRP-USD": "XRP", "ADA-USD": "ADA", "DOGE-USD": "DOGE",
  "DOT-USD": "DOT", "POL-USD": "MATIC", "AVAX-USD": "AVAX",
  "LINK-USD": "LINK",
};

const REVERSE_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(MAP)) REVERSE_MAP[v] = k;

const STOCK_TYPES: Record<string, string> = {
  AAPL: "stock", MSFT: "stock", GOOGL: "stock", AMZN: "stock",
  NVDA: "stock", META: "stock", TSLA: "stock", JPM: "stock",
  V: "stock", IBM: "stock", SAN: "stock", GGAL: "stock",
  MU: "stock", NFLX: "stock", MELI: "stock", AMD: "stock",
  INTC: "stock", ADBE: "stock", NKE: "stock", ADDYY: "stock",
  MCD: "stock", WMT: "stock", COIN: "stock", ASML: "stock",
  PEP: "stock", PYPL: "stock", CVX: "stock", ACN: "stock",
  GC: "commodity", CL: "commodity", SI: "commodity",
};

function toYahoo(symbol: string, type: string): string {
  if (type === "crypto") return REVERSE_MAP[symbol] || `${symbol}-USD`;
  if (type === "stock") return symbol;
  if (type === "commodity") return `${symbol}=F`;
  return symbol;
}

async function evaluate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: alerts } = await supabase
    .from("indicator_alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("triggered", false);

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ triggered: [] });
  }

  const bySymbol: Record<string, typeof alerts> = {};
  for (const a of alerts) {
    const key = `${a.symbol}|${a.timeframe}`;
    if (!bySymbol[key]) bySymbol[key] = [];
    bySymbol[key].push(a);
  }

  const triggered: { id: string; symbol: string; indicator_type: string; condition: string; value: number }[] = [];

  for (const [key, group] of Object.entries(bySymbol)) {
    const [symbol, timeframe] = key.split("|");
    const assetType = group[0].asset_type;

    try {
      const yahooSymbol = toYahoo(symbol, assetType);
      const days = timeframe === "1h" ? "5" : "30";
      const bars = await fetchOhlc(yahooSymbol, assetType, days, timeframe === "1h" ? "1h" : undefined);
      if (bars.length < 30) continue;

      const close = bars.map((b) => b.close);
      const lastClose = close[close.length - 1];

      for (const a of group) {
        let fired = false;

        switch (a.indicator_type) {
          case "rsi": {
            const rsi = computeRsi(close, 14);
            const lastRsi = rsi[rsi.length - 1];
            if (lastRsi == null) break;
            if (a.condition === "above" && lastRsi > a.value) fired = true;
            if (a.condition === "below" && lastRsi < a.value) fired = true;
            break;
          }
          case "macd_cross": {
            const { macdLine, signalLine } = computeMacd(close);
            const len = macdLine.length;
            if (len < 2) break;
            const prevM = macdLine[len - 2], currM = macdLine[len - 1];
            const prevS = signalLine[len - 2], currS = signalLine[len - 1];
            if (a.condition === "cross_above" && prevM <= prevS && currM > currS) fired = true;
            if (a.condition === "cross_below" && prevM >= prevS && currM < currS) fired = true;
            break;
          }
          case "bollinger": {
            const bb = computeBollinger(close);
            const u = bb.upper[bb.upper.length - 1];
            const l = bb.lower[bb.lower.length - 1];
            if (u == null || l == null) break;
            if (a.condition === "above" && lastClose > u) fired = true;
            if (a.condition === "below" && lastClose < l) fired = true;
            break;
          }
          case "sma_cross": {
            const sma20 = computeSma(close, 20);
            const sma50 = computeSma(close, 50);
            const len = sma20.length;
            if (len < 2) break;
            const p20 = sma20[len - 2], c20 = sma20[len - 1];
            const p50 = sma50[len - 2], c50 = sma50[len - 1];
            if (p20 == null || c20 == null || p50 == null || c50 == null) break;
            if (a.condition === "cross_above" && p20 <= p50 && c20 > c50) fired = true;
            if (a.condition === "cross_below" && p20 >= p50 && c20 < c50) fired = true;
            break;
          }
          case "ema_cross": {
            const ema12 = computeEma(close, 12);
            const ema26 = computeEma(close, 26);
            const len = ema12.length;
            if (len < 2) break;
            if (a.condition === "cross_above" && ema12[len - 2] <= ema26[len - 2] && ema12[len - 1] > ema26[len - 1]) fired = true;
            if (a.condition === "cross_below" && ema12[len - 2] >= ema26[len - 2] && ema12[len - 1] < ema26[len - 1]) fired = true;
            break;
          }
          case "volatility_spike": {
            const vol = computeVolatility(close);
            if (a.condition === "above" && vol > a.value) fired = true;
            if (a.condition === "below" && vol < a.value) fired = true;
            break;
          }
          case "volume_spike": {
            const volSma = computeVolumeSma(bars, 20);
            const volSmaLast = volSma[volSma.length - 1];
            const lastVol = bars[bars.length - 1].volume ?? 0;
            if (volSmaLast == null || volSmaLast === 0) break;
            if (a.condition === "above" && lastVol > a.value * volSmaLast) fired = true;
            if (a.condition === "below" && lastVol < a.value * volSmaLast) fired = true;
            break;
          }
          case "consecutive": {
            const n = Math.floor(a.value);
            if (n < 2 || bars.length < n + 1) break;
            const isUp = (b: typeof bars[0]) => b.close > b.open;
            const isDown = (b: typeof bars[0]) => b.close < b.open;
            let streak = 1;
            for (let i = bars.length - 1; i >= bars.length - n; i--) {
              if (i <= 0) break;
              if (a.condition === "above" && isUp(bars[i]) && isUp(bars[i - 1])) streak++;
              else if (a.condition === "below" && isDown(bars[i]) && isDown(bars[i - 1])) streak++;
              else break;
            }
            if (streak >= n) fired = true;
            break;
          }
          case "bb_width": {
            const bb = computeBollinger(close);
            const w = bb.width[bb.width.length - 1];
            if (w == null) break;
            if (a.condition === "above" && w > a.value) fired = true;
            if (a.condition === "below" && w < a.value) fired = true;
            break;
          }
        }

        if (fired) {
          await supabase.from("indicator_alerts").update({ triggered: true }).eq("id", a.id);
          triggered.push({ id: a.id, symbol: a.symbol, indicator_type: a.indicator_type, condition: a.condition, value: a.value });
        }
      }
    } catch {
      console.error("evaluate failed for", symbol);
    }
  }

  return NextResponse.json({ triggered });
}

export const GET = evaluate;
export const POST = evaluate;
