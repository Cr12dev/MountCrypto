"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { OhlcBar } from "@/lib/api/yahoo";
import type { IndicatorSet, PatternSignal } from "@/lib/indicators";
import { CandlePattern, PATTERN_LABELS } from "@/lib/indicators";

const COLORS = {
  bg: "#080b12",
  grid: "#192032",
  crosshair: "#5d6b82",
  text: "#5d6b82",
  textPrimary: "#d1d4dc",
  green: "#00c853",
  red: "#ff1744",
  tooltipBg: "#111520",
  tooltipBorder: "#1e2a3a",
  sma20: "#f7931a",
  sma50: "#2962ff",
  sma200: "#e040fb",
  ema12: "#ff8a65",
  ema26: "#4dd0e1",
  bollinger: "#5c6bc0",
  rsiLine: "#7c4dff",
  macdLine: "#2196f3",
  signalLine: "#ff9800",
  histogramUp: "#00c853",
  histogramDown: "#ff1744",
  overbought: "#f23645",
  oversold: "#089981",
};

const RIGHT = 64;
const BOTTOM = 24;
const TOP = 8;
const LEFT = 4;
const SUB_TOP = 8;
const SUB_BOT = 16;
const RSI_PANEL_PCT = 0.18;
const MACD_PANEL_PCT = 0.18;

interface TooltipData {
  x: number;
  y: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  isUp: boolean;
}

export type ActiveIndicator = "sma20" | "sma50" | "sma200" | "ema12" | "ema26" | "bollinger" | "rsi" | "macd" | "patterns";

export function CandlestickChart({
  data,
  height = 320,
  indicators,
  patterns,
  activeIndicators = [],
}: {
  data: OhlcBar[];
  height?: number;
  indicators?: IndicatorSet;
  patterns?: PatternSignal[];
  activeIndicators?: ActiveIndicator[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startIdx: number } | null>(null);
  const visibleStartRef = useRef(0);
  const visibleCountRef = useRef(40);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [patternTooltip, setPatternTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const hasRsi = activeIndicators.includes("rsi");
  const hasMacd = activeIndicators.includes("macd");
  const priceChartH = (() => {
    let pct = 1;
    if (hasRsi) pct -= RSI_PANEL_PCT;
    if (hasMacd) pct -= MACD_PANEL_PCT;
    return pct;
  })();

  function fmtPrice(n: number) {
    if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (n >= 0.01) return n.toFixed(4);
    return n.toFixed(6);
  }

  function fmtTime(ts: number) {
    const d = new Date(ts * 1000);
    return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
  }

  function calcBounds(slice: OhlcBar[], pad = 0.08) {
    let min = Infinity, max = -Infinity;
    for (const c of slice) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const p = (max - min) * pad || 1;
    return { min: min - p, max: max + p, range: max - min + 2 * p };
  }

  const shared = useMemo(() => {
    const close = data.map((b) => b.close);
    const rsiVals = hasRsi && indicators?.rsi14 ? indicators.rsi14 : [];
    const macdVals = hasMacd && indicators?.macd ? indicators.macd.macdLine : [];
    const signalVals = hasMacd && indicators?.macd ? indicators.macd.signalLine : [];
    const histVals = hasMacd && indicators?.macd ? indicators.macd.histogram : [];

    let rsiMin = 0, rsiMax = 100;
    if (rsiVals.length) {
      const filtered = rsiVals.filter((v): v is number => v != null);
      if (filtered.length) { rsiMin = Math.min(30, ...filtered); rsiMax = Math.max(70, ...filtered); }
    }
    let macdMin = -1, macdMax = 1;
    const allMacd = [...macdVals, ...signalVals, ...histVals];
    if (allMacd.length) {
      macdMin = Math.min(...allMacd);
      macdMax = Math.max(...allMacd);
      const mag = Math.max(Math.abs(macdMin), Math.abs(macdMax)) * 1.2 || 1;
      macdMin = -mag;
      macdMax = mag;
    }
    return { rsiMin, rsiMax, macdMin, macdMax };
  }, [data, indicators, hasRsi, hasMacd]);

  function drawPriceLabels(ctx: CanvasRenderingContext2D, w: number, h: number, minP: number, maxP: number) {
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = COLORS.text;
    const subH = h * priceChartH;
    for (let i = 0; i <= 4; i++) {
      const y = TOP + (subH / 4) * i;
      const price = maxP - ((maxP - minP) / 4) * i;
      ctx.fillText(fmtPrice(price), w - RIGHT + 4, y);
    }
  }

  function drawTimeLabels(ctx: CanvasRenderingContext2D, w: number, h: number, slice: OhlcBar[], candleGap: number, halfW: number) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = COLORS.text;
    for (let i = 0; i < slice.length; i += Math.max(1, Math.floor(slice.length / 6))) {
      const x = LEFT + i * candleGap + halfW;
      ctx.fillText(fmtTime(slice[i].time), x, h - BOTTOM + 8);
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, chartArea: { top: number; left: number; width: number; height: number }) {
    const { top, left, width, height } = chartArea;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      const y = top + (height / 8) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }
    const sliceLen = Math.min(visibleCountRef.current, data.length - visibleStartRef.current);
    const gap = Math.max(1, Math.floor(sliceLen / 6));
    for (let i = 0; i < sliceLen; i += gap) {
      const x = left + (i / sliceLen) * width;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
  }

  function drawSmaLine(ctx: CanvasRenderingContext2D, values: (number | null)[], color: string, w: number, h: number, minP: number, range: number, sliceStart: number, candleGap: number) {
    const chartH = h * priceChartH;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v == null) { started = false; continue; }
      const idx = i - sliceStart;
      if (idx < 0) continue;
      const x = LEFT + idx * candleGap;
      const y = TOP + chartH - ((v - minP) / range) * chartH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawEmaLine(ctx: CanvasRenderingContext2D, values: number[], color: string, w: number, h: number, minP: number, range: number, sliceStart: number, candleGap: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
      const idx = i - sliceStart;
      if (idx < 0) continue;
      const x = LEFT + idx * candleGap;
      const y = TOP + h * priceChartH - ((values[i] - minP) / range) * h * priceChartH;
      if (idx === 0 || i === sliceStart) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawBollinger(ctx: CanvasRenderingContext2D, w: number, h: number, minP: number, range: number, sliceStart: number, candleGap: number) {
    if (!indicators?.bollinger) return;
    const { upper, middle, lower } = indicators.bollinger;
    const chartH = h * priceChartH;

    ctx.strokeStyle = COLORS.bollinger;
    ctx.lineWidth = 0.8;

    const drawLine = (values: (number | null)[]) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v == null) { started = false; continue; }
        const idx = i - sliceStart;
        if (idx < 0) continue;
        const x = LEFT + idx * candleGap;
        const y = TOP + chartH - ((v - minP) / range) * chartH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    drawLine(upper);
    drawLine(middle);
    drawLine(lower);

    const fillUpper: number[] = [];
    const fillLower: number[] = [];
    for (let i = 0; i < upper.length; i++) {
      if (upper[i] != null && lower[i] != null) {
        fillUpper.push(upper[i]!);
        fillLower.push(lower[i]!);
      }
    }
    if (fillUpper.length > 1) {
      ctx.fillStyle = "rgba(92, 107, 192, 0.08)";
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < upper.length; i++) {
        const v = upper[i];
        if (v == null) { started = false; continue; }
        const idx = i - sliceStart;
        if (idx < 0) continue;
        const x = LEFT + idx * candleGap;
        const y = TOP + chartH - ((v - minP) / range) * chartH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      for (let i = lower.length - 1; i >= 0; i--) {
        const v = lower[i];
        if (v == null) continue;
        const idx = i - sliceStart;
        if (idx < 0 || idx * candleGap < 0) continue;
        const x = LEFT + idx * candleGap;
        const y = TOP + chartH - ((v - minP) / range) * chartH;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCandles(ctx: CanvasRenderingContext2D, w: number, h: number, slice: OhlcBar[], minP: number, range: number, candleGap: number) {
    const chartH = h * priceChartH;
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const x = LEFT + i * candleGap;
      const isUp = c.close >= c.open;
      const color = isUp ? COLORS.green : COLORS.red;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, TOP + chartH - ((c.high - minP) / range) * chartH);
      ctx.lineTo(x, TOP + chartH - ((c.low - minP) / range) * chartH);
      ctx.stroke();

      ctx.fillStyle = color;
      const bodyTop = TOP + chartH - ((Math.max(c.open, c.close) - minP) / range) * chartH;
      const bodyBot = TOP + chartH - ((Math.min(c.open, c.close) - minP) / range) * chartH;
      const bodyH = Math.max(1, bodyBot - bodyTop);

      const hw = Math.max(1, Math.floor(candleGap * 0.4));
      ctx.fillRect(x - hw, bodyTop, hw * 2, bodyH);
    }
  }

  function getCandleWidth(sliceLen: number, chartW: number, visibleC: number) {
    const gap = Math.max(2, Math.floor(chartW / visibleC));
    return { candleW: Math.max(1, gap - 2), gap, halfW: Math.floor(gap / 2) };
  }

  function drawPatternMarkers(ctx: CanvasRenderingContext2D, w: number, h: number, slice: OhlcBar[], sliceStart: number, minP: number, range: number, candleGap: number) {
    if (!patterns?.length) return;
    const chartH = h * priceChartH;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (const sig of patterns) {
      const idx = sig.index - sliceStart;
      if (idx < 0 || idx >= slice.length) continue;
      const x = LEFT + idx * candleGap;
      const y = TOP + chartH - ((slice[idx].high - minP) / range) * chartH - 2;

      let icon = "";
      switch (sig.pattern) {
        case CandlePattern.BullishEngulfing: icon = "🟢"; break;
        case CandlePattern.BearishEngulfing: icon = "🔴"; break;
        case CandlePattern.Doji: icon = "⚪"; break;
        case CandlePattern.Hammer: icon = "🔨"; break;
        case CandlePattern.ShootingStar: icon = "⭐"; break;
      }
      ctx.fillText(icon, x, y);
    }
  }

  function drawRsiPanel(ctx: CanvasRenderingContext2D, w: number, h: number, slice: OhlcBar[], sliceStart: number, candleGap: number) {
    if (!indicators?.rsi14) return;
    const panelTop = h * priceChartH;
    const panelH = h * RSI_PANEL_PCT;
    const chartW = w - LEFT - RIGHT;
    const { rsiMin, rsiMax } = shared;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(LEFT, panelTop, chartW, panelH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT, panelTop, chartW, panelH);
    ctx.clip();

    // grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = panelTop + (panelH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(LEFT, y);
      ctx.lineTo(LEFT + chartW, y);
      ctx.stroke();
    }

    // overbought / oversold zones
    const obY = panelTop + panelH - ((70 - rsiMin) / (rsiMax - rsiMin)) * panelH;
    const osY = panelTop + panelH - ((30 - rsiMin) / (rsiMax - rsiMin)) * panelH;
    ctx.fillStyle = "rgba(242, 54, 69, 0.05)";
    ctx.fillRect(LEFT, panelTop, chartW, obY - panelTop);
    ctx.fillStyle = "rgba(8, 153, 129, 0.05)";
    ctx.fillRect(LEFT, osY, chartW, panelTop + panelH - osY);

    // lines at 70/30
    ctx.strokeStyle = COLORS.overbought;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(LEFT, obY); ctx.lineTo(LEFT + chartW, obY); ctx.stroke();
    ctx.strokeStyle = COLORS.oversold;
    ctx.beginPath(); ctx.moveTo(LEFT, osY); ctx.lineTo(LEFT + chartW, osY); ctx.stroke();
    ctx.setLineDash([]);

    // RSI line
    ctx.strokeStyle = COLORS.rsiLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < indicators.rsi14.length; i++) {
      const v = indicators.rsi14[i];
      if (v == null) { started = false; continue; }
      const idx = i - sliceStart;
      if (idx < 0) continue;
      const x = LEFT + idx * candleGap;
      const y = panelTop + panelH - ((v - rsiMin) / (rsiMax - rsiMin)) * panelH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();

    // labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillStyle = COLORS.text;
    for (const val of [70, 50, 30]) {
      const y = panelTop + panelH - ((val - rsiMin) / (rsiMax - rsiMin)) * panelH;
      ctx.fillText(String(val), w - RIGHT + 4, y);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "9px sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("RSI(14)", LEFT + 4, panelTop + 2);
  }

  function drawMacdPanel(ctx: CanvasRenderingContext2D, w: number, h: number, slice: OhlcBar[], sliceStart: number, candleGap: number) {
    if (!indicators?.macd) return;
    const { macdLine, signalLine, histogram } = indicators.macd;
    const { macdMin, macdMax } = shared;
    const topOfMacd = hasRsi ? h * (priceChartH + RSI_PANEL_PCT) : h * priceChartH;
    const panelH = h * MACD_PANEL_PCT;
    const chartW = w - LEFT - RIGHT;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(LEFT, topOfMacd, chartW, panelH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT, topOfMacd, chartW, panelH);
    ctx.clip();

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = topOfMacd + (panelH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(LEFT, y);
      ctx.lineTo(LEFT + chartW, y);
      ctx.stroke();
    }

    // zero line
    const zeroY = topOfMacd + panelH - ((0 - macdMin) / (macdMax - macdMin)) * panelH;
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(LEFT, zeroY);
    ctx.lineTo(LEFT + chartW, zeroY);
    ctx.stroke();

    // histogram
    const barW = Math.max(1, candleGap - 2);
    for (let i = 0; i < histogram.length; i++) {
      const idx = i - sliceStart;
      if (idx < 0 || idx >= slice.length) continue;
      const v = histogram[i];
      const x = LEFT + idx * candleGap;
      const hY = topOfMacd + panelH - ((v - macdMin) / (macdMax - macdMin)) * panelH;
      ctx.fillStyle = v >= 0 ? COLORS.histogramUp : COLORS.histogramDown;
      ctx.fillRect(x - barW / 2, Math.min(hY, zeroY), barW, Math.max(1, Math.abs(hY - zeroY)));
    }

    // MACD line
    ctx.strokeStyle = COLORS.macdLine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < macdLine.length; i++) {
      const idx = i - sliceStart;
      if (idx < 0) continue;
      const x = LEFT + idx * candleGap;
      const y = topOfMacd + panelH - ((macdLine[i] - macdMin) / (macdMax - macdMin)) * panelH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Signal line
    ctx.strokeStyle = COLORS.signalLine;
    ctx.lineWidth = 1.2;
    started = false;
    for (let i = 0; i < signalLine.length; i++) {
      const idx = i - sliceStart;
      if (idx < 0) continue;
      const x = LEFT + idx * candleGap;
      const y = topOfMacd + panelH - ((signalLine[i] - macdMin) / (macdMax - macdMin)) * panelH;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();

    // labels
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "9px sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("MACD(12,26,9)", LEFT + 4, topOfMacd + 2);
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data.length) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    const chartW = w - LEFT - RIGHT;
    const vs = visibleStartRef.current;
    const vc = visibleCountRef.current;

    const end = Math.min(vs + vc, data.length);
    const slice = data.slice(vs, end);
    if (!slice.length) return;

    const { halfW, gap: candleGap } = getCandleWidth(slice.length, chartW, vc);

    const { min, max, range } = calcBounds(slice);
    const chartArea = { top: TOP, left: LEFT, width: chartW, height: h * priceChartH };
    drawGrid(ctx, w, h, chartArea);
    drawCandles(ctx, w, h, slice, min, range, candleGap);

    // overlays
    if (indicators) {
      if (activeIndicators.includes("bollinger") && indicators.bollinger) {
        drawBollinger(ctx, w, h, min, range, vs, candleGap);
      }
      if (activeIndicators.includes("sma20") && indicators.sma20) {
        drawSmaLine(ctx, indicators.sma20, COLORS.sma20, w, h, min, range, vs, candleGap);
      }
      if (activeIndicators.includes("sma50") && indicators.sma50) {
        drawSmaLine(ctx, indicators.sma50, COLORS.sma50, w, h, min, range, vs, candleGap);
      }
      if (activeIndicators.includes("sma200") && indicators.sma200) {
        drawSmaLine(ctx, indicators.sma200, COLORS.sma200, w, h, min, range, vs, candleGap);
      }
      if (activeIndicators.includes("ema12") && indicators.ema12) {
        drawEmaLine(ctx, indicators.ema12, COLORS.ema12, w, h, min, range, vs, candleGap);
      }
      if (activeIndicators.includes("ema26") && indicators.ema26) {
        drawEmaLine(ctx, indicators.ema26, COLORS.ema26, w, h, min, range, vs, candleGap);
      }
    }

    if (activeIndicators.includes("patterns")) {
      drawPatternMarkers(ctx, w, h, slice, vs, min, range, candleGap);
    }

    drawPriceLabels(ctx, w, h, min, max);
    drawTimeLabels(ctx, w, h, slice, candleGap, halfW);

    if (hasRsi) drawRsiPanel(ctx, w, h, slice, vs, candleGap);
    if (hasMacd) drawMacdPanel(ctx, w, h, slice, vs, candleGap);
  }, [data, height, indicators, patterns, activeIndicators, hasRsi, hasMacd, shared, priceChartH]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const container = containerRef.current;
    if (!overlay || !container || !data.length) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.getBoundingClientRect().width;
    const h = height;

    overlay.width = w * dpr;
    overlay.height = h * dpr;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;

    const ctx = overlay.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const chartW = w - LEFT - RIGHT;
    const vs = visibleStartRef.current;
    const vc = visibleCountRef.current;
    const end = Math.min(vs + vc, data.length);
    const slice = data.slice(vs, end);
    if (!slice.length) return;

    const { halfW, gap: candleGap } = getCandleWidth(slice.length, chartW, vc);
    const { min, max, range } = calcBounds(slice);

    function yVal(v: number) {
      return TOP + h * priceChartH - ((v - min) / range) * h * priceChartH;
    }

    function xVal(idx: number) {
      return LEFT + (idx - vs) * candleGap;
    }

    const crosshair = crosshairRef.current;
    if (!crosshair || crosshair.x < LEFT || crosshair.x > LEFT + chartW || crosshair.y < TOP || crosshair.y > TOP + h * priceChartH) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(crosshair.x, TOP);
    ctx.lineTo(crosshair.x, TOP + h * priceChartH);
    ctx.moveTo(LEFT, crosshair.y);
    ctx.lineTo(LEFT + chartW, crosshair.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const idx = Math.round((crosshair.x - LEFT - halfW) / candleGap);
    const c = slice[idx];
    if (!c) return;

    const d = new Date(c.time * 1000);
    const isUp = c.close >= c.open;
    const tx = Math.max(4, Math.min(w - 4 - 160, xVal(idx) - 80));
    const ty = crosshair.y - 60 < 4 ? crosshair.y + 12 : crosshair.y - 60;

    setTooltip({
      x: tx,
      y: ty,
      time: d.toUTCString().slice(5, 22),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      isUp,
    });
  }, [data, height, priceChartH]);

  useEffect(() => {
    drawCanvas();
    const onResize = () => drawCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawCanvas]);

  useEffect(() => {
    let raf: number;
    function loop() {
      drawOverlay();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drawOverlay]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    crosshairRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onMouseLeave = useCallback(() => {
    crosshairRef.current = null;
    setTooltip(null);
    setPatternTooltip(null);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 4 : -4;
    visibleCountRef.current = Math.max(10, Math.min(data.length, visibleCountRef.current + delta));
    drawCanvas();
  }, [data.length, drawCanvas]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startIdx: visibleStartRef.current };
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onMouseMoveDrag = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !data.length) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const chartW = rect.width - LEFT - RIGHT;
    const vc = visibleCountRef.current;
    const gap = Math.max(2, Math.floor(chartW / vc));
    const dx = dragRef.current.startX - e.clientX;
    const shift = Math.round(dx / gap);
    const newStart = Math.max(0, Math.min(data.length - vc, dragRef.current.startIdx + shift));
    if (newStart !== visibleStartRef.current) {
      visibleStartRef.current = newStart;
      dragRef.current.startIdx = newStart;
      dragRef.current.startX = e.clientX;
      drawCanvas();
    }
  }, [data.length, drawCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height }}
      onMouseMove={(e) => { onMouseMove(e); onMouseMoveDrag(e); }}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <canvas ref={canvasRef} className="block w-full" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 block" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded border px-2.5 py-1.5"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: COLORS.tooltipBg,
            borderColor: COLORS.tooltipBorder,
          }}
        >
          <div style={{ font: "10px JetBrains Mono, monospace", color: COLORS.text }}>
            {tooltip.time}
          </div>
          <div style={{ font: "11px JetBrains Mono, monospace", color: COLORS.textPrimary, marginTop: 2 }}>
            O: <span style={{ color: tooltip.isUp ? COLORS.green : COLORS.red }}>{fmtPrice(tooltip.open)}</span>
            {" "}H: <span style={{ color: tooltip.isUp ? COLORS.green : COLORS.red }}>{fmtPrice(tooltip.high)}</span>
          </div>
          <div style={{ font: "11px JetBrains Mono, monospace", color: COLORS.textPrimary }}>
            L: <span style={{ color: tooltip.isUp ? COLORS.green : COLORS.red }}>{fmtPrice(tooltip.low)}</span>
            {" "}C: <span style={{ color: tooltip.isUp ? COLORS.green : COLORS.red }}>{fmtPrice(tooltip.close)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
