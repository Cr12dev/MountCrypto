import type { OhlcBar } from "./api/yahoo";

// ── SMA ──
export function computeSma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

// ── EMA ──
export function computeEma(data: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(ema); continue; }
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

// ── RSI (14 by default) ──
export function computeRsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (data.length < period + 1) return data.map(() => null);

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  result.push(null); // index 0
  for (let i = 1; i < period; i++) result.push(null);
  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + firstRs));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

// ── MACD ──
export function computeMacd(data: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = computeEma(data, fast);
  const emaSlow = computeEma(data, slow);
  const macdLine: number[] = emaFast.map((f, i) => f - emaSlow[i]);
  const signalLine = computeEma(macdLine, signal);
  const histogram: number[] = macdLine.map((m, i) => m - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

// ── Bollinger Bands (20/2 by default) ──
export function computeBollinger(data: number[], period = 20, stdDev = 2) {
  const middle = computeSma(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    const m = middle[i];
    if (m == null) { upper.push(null); lower.push(null); width.push(null); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (data[j] - m) ** 2;
    const sd = Math.sqrt(sumSq / period);
    upper.push(m + sd * stdDev);
    lower.push(m - sd * stdDev);
    width.push(upper[i]! - lower[i]!);
  }
  return { upper, middle, lower, width };
}

// ── Volatility (annualised, from daily returns) ──
export function computeVolatility(data: number[]): number {
  if (data.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i] - data[i - 1]) / data[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 252);
}

// ── Volume SMA ──
export function computeVolumeSma(bars: OhlcBar[], period = 20): (number | null)[] {
  const volumes = bars.map((b) => b.volume ?? 0);
  const result: (number | null)[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += volumes[j];
    result.push(sum / period);
  }
  return result;
}

// ── Complete indicator set for a chart ──
export interface IndicatorSet {
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  sma200?: (number | null)[];
  ema12?: number[];
  ema26?: number[];
  rsi14?: (number | null)[];
  macd?: ReturnType<typeof computeMacd>;
  bollinger?: ReturnType<typeof computeBollinger>;
  volumeSma?: (number | null)[];
}

export function computeIndicators(bars: OhlcBar[]): IndicatorSet {
  const close = bars.map((b) => b.close);
  return {
    sma20: computeSma(close, 20),
    sma50: computeSma(close, 50),
    sma200: computeSma(close, 200),
    ema12: computeEma(close, 12),
    ema26: computeEma(close, 26),
    rsi14: computeRsi(close, 14),
    macd: computeMacd(close),
    bollinger: computeBollinger(close),
    volumeSma: computeVolumeSma(bars),
  };
}

// ── Candlestick patterns ──
export enum CandlePattern {
  BullishEngulfing = "bullish_engulfing",
  BearishEngulfing = "bearish_engulfing",
  Doji = "doji",
  Hammer = "hammer",
  ShootingStar = "shooting_star",
}

export interface PatternSignal {
  index: number;
  pattern: CandlePattern;
  time: number;
  strength: number; // 0-1
}

function isDoji(c: OhlcBar, threshold = 0.01): boolean {
  const range = c.high - c.low;
  if (range === 0) return false;
  const body = Math.abs(c.close - c.open);
  return body / range < threshold;
}

function isHammer(c: OhlcBar, prev: OhlcBar): boolean {
  const body = Math.abs(c.close - c.open);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  if (body === 0) return false;
  const total = body + lowerWick + upperWick;
  if (total === 0) return false;
  const bodyRatio = body / total;
  const lowerRatio = lowerWick / total;
  return bodyRatio < 0.35 && lowerRatio > 0.5 && upperWick / total < 0.1 && c.close > prev.close;
}

function isShootingStar(c: OhlcBar, prev: OhlcBar): boolean {
  const body = Math.abs(c.close - c.open);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  if (body === 0) return false;
  const total = body + lowerWick + upperWick;
  if (total === 0) return false;
  const bodyRatio = body / total;
  const upperRatio = upperWick / total;
  return bodyRatio < 0.35 && upperRatio > 0.5 && lowerWick / total < 0.1 && c.close < prev.close;
}

function isBullishEngulfing(c: OhlcBar, prev: OhlcBar): boolean {
  return prev.close < prev.open && c.close > c.open && c.open < prev.close && c.close > prev.open;
}

function isBearishEngulfing(c: OhlcBar, prev: OhlcBar): boolean {
  return prev.close > prev.open && c.close < c.open && c.open > prev.close && c.close < prev.open;
}

export function scanPatterns(bars: OhlcBar[]): PatternSignal[] {
  const signals: PatternSignal[] = [];
  for (let i = 1; i < bars.length; i++) {
    const c = bars[i];
    const prev = bars[i - 1];
    if (isBullishEngulfing(c, prev)) signals.push({ index: i, pattern: CandlePattern.BullishEngulfing, time: c.time, strength: 0.8 });
    if (isBearishEngulfing(c, prev)) signals.push({ index: i, pattern: CandlePattern.BearishEngulfing, time: c.time, strength: 0.8 });
    if (isDoji(c)) signals.push({ index: i, pattern: CandlePattern.Doji, time: c.time, strength: 0.3 });
    if (isHammer(c, prev)) signals.push({ index: i, pattern: CandlePattern.Hammer, time: c.time, strength: 0.7 });
    if (isShootingStar(c, prev)) signals.push({ index: i, pattern: CandlePattern.ShootingStar, time: c.time, strength: 0.7 });
  }
  return signals;
}

export const PATTERN_LABELS: Record<CandlePattern, string> = {
  [CandlePattern.BullishEngulfing]: "Bullish Engulfing",
  [CandlePattern.BearishEngulfing]: "Bearish Engulfing",
  [CandlePattern.Doji]: "Doji",
  [CandlePattern.Hammer]: "Hammer",
  [CandlePattern.ShootingStar]: "Shooting Star",
};

export const PATTERN_ICONS: Record<CandlePattern, string> = {
  [CandlePattern.BullishEngulfing]: "🟢",
  [CandlePattern.BearishEngulfing]: "🔴",
  [CandlePattern.Doji]: "⚪",
  [CandlePattern.Hammer]: "🔨",
  [CandlePattern.ShootingStar]: "⭐",
};

// ── Screener types ──
export interface ScreenerCriteria {
  priceMin?: number;
  priceMax?: number;
  changeMin?: number;
  changeMax?: number;
  volumeMin?: number;
  marketCapMin?: number;
  marketCapMax?: number;
  sector?: string;
  rsiMin?: number;
  rsiMax?: number;
}
