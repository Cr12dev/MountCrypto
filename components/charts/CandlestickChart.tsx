"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { OhlcBar } from "@/lib/api/yahoo";

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
};

const RIGHT = 64;
const BOTTOM = 24;
const TOP = 8;
const LEFT = 4;

export function CandlestickChart({
  data,
  height = 320,
}: {
  data: OhlcBar[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(40);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  const dragRef = useRef<{ startX: number; startIdx: number } | null>(null);

  const draw = useCallback(() => {
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
    const chartH = h - TOP - BOTTOM;

    const end = Math.min(visibleStart + visibleCount, data.length);
    const slice = data.slice(visibleStart, end);
    if (!slice.length) return;

    const candleW = Math.max(2, Math.floor(chartW / visibleCount) - 1);
    const halfW = Math.max(1, Math.floor(candleW / 2));

    let minP = Infinity, maxP = -Infinity;
    for (const c of slice) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    const pad = (maxP - minP) * 0.08 || 1;
    minP -= pad;
    maxP += pad;
    const range = maxP - minP;

    function yVal(v: number) {
      return TOP + chartH - ((v - minP) / range) * chartH;
    }

    function xVal(idx: number) {
      return LEFT + (idx - visibleStart) * (candleW + 1) + halfW;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(LEFT, TOP, chartW, chartH);
    ctx.clip();

    for (let i = 0; i <= 8; i++) {
      const y = TOP + (chartH / 8) * i;
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(LEFT, y);
      ctx.lineTo(LEFT + chartW, y);
      ctx.stroke();
    }
    for (let i = 0; i < slice.length; i += Math.max(1, Math.floor(slice.length / 6))) {
      const x = LEFT + i * (candleW + 1) + halfW;
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, TOP);
      ctx.lineTo(x, TOP + chartH);
      ctx.stroke();
    }

    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const x = LEFT + i * (candleW + 1) + halfW;
      const isUp = c.close >= c.open;
      const color = isUp ? COLORS.green : COLORS.red;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yVal(c.high));
      ctx.lineTo(x, yVal(c.low));
      ctx.stroke();

      ctx.fillStyle = color;
      const bodyTop = yVal(Math.max(c.open, c.close));
      const bodyBot = yVal(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBot - bodyTop);
      ctx.fillRect(x - halfW, bodyTop, candleW, bodyH);
    }

    ctx.restore();

    function fmtPrice(n: number) {
      if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (n >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      if (n >= 0.01) return n.toFixed(4);
      return n.toFixed(6);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = COLORS.text;
    for (let i = 0; i <= 6; i++) {
      const y = TOP + (chartH / 6) * i;
      const price = maxP - (range / 6) * i;
      ctx.fillText(fmtPrice(price), w - RIGHT + 4, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < slice.length; i += Math.max(1, Math.floor(slice.length / 6))) {
      const x = LEFT + i * (candleW + 1) + halfW;
      const c = slice[i];
      const d = new Date(c.time * 1000);
      const label = `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
      ctx.fillText(label, x, h - BOTTOM + 8);
    }

    if (crosshair && crosshair.x >= LEFT && crosshair.x <= LEFT + chartW && crosshair.y >= TOP && crosshair.y <= TOP + chartH) {
      ctx.save();
      ctx.strokeStyle = COLORS.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, TOP);
      ctx.lineTo(crosshair.x, TOP + chartH);
      ctx.moveTo(LEFT, crosshair.y);
      ctx.lineTo(LEFT + chartW, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const tooltip = tooltipRef.current;
    if (crosshair && crosshair.x >= LEFT && crosshair.x <= LEFT + chartW) {
      const idx = Math.round((crosshair.x - LEFT - halfW) / (candleW + 1));
      const c = slice[idx];
      if (c) {
        const isUp = c.close >= c.open;
        const d = new Date(c.time * 1000);
        tooltip!.style.display = "block";
        tooltip!.innerHTML = `
          <div style="font:10px JetBrains Mono,monospace;color:${COLORS.text}">${d.toUTCString().slice(5, 22)}</div>
          <div style="font:11px JetBrains Mono,monospace;color:${COLORS.textPrimary};margin-top:2px">
            O: <span style="color:${isUp ? COLORS.green : COLORS.red}">${fmtPrice(c.open)}</span>
            H: <span style="color:${isUp ? COLORS.green : COLORS.red}">${fmtPrice(c.high)}</span>
          </div>
          <div style="font:11px JetBrains Mono,monospace;color:${COLORS.textPrimary}">
            L: <span style="color:${isUp ? COLORS.green : COLORS.red}">${fmtPrice(c.low)}</span>
            C: <span style="color:${isUp ? COLORS.green : COLORS.red}">${fmtPrice(c.close)}</span>
          </div>
        `;
        const tooltipW = tooltip!.offsetWidth;
        const tooltipH = tooltip!.offsetHeight;
        let tx = xVal(idx) - tooltipW / 2;
        if (tx < 4) tx = 4;
        if (tx + tooltipW > w - 4) tx = w - tooltipW - 4;
        let ty = crosshair.y - tooltipH - 12;
        if (ty < 4) ty = crosshair.y + 12;
        tooltip!.style.left = `${tx}px`;
        tooltip!.style.top = `${ty}px`;
      }
    } else {
      tooltip!.style.display = "none";
    }
  }, [data, height, visibleStart, visibleCount, crosshair]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const onMouseLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 4 : -4;
    setVisibleCount((prev) => Math.max(10, Math.min(data.length, prev + delta)));
  }, [data.length]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startIdx: visibleStart };
  }, [visibleStart]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onMouseMoveDrag = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !data.length) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const chartW = rect.width - LEFT - RIGHT;
    const candleW = Math.max(2, Math.floor(chartW / visibleCount) - 1);
    const gap = candleW + 1;
    const dx = dragRef.current.startX - e.clientX;
    const shift = Math.round(dx / gap);
    const newStart = Math.max(0, Math.min(data.length - visibleCount, dragRef.current.startIdx + shift));
    if (newStart !== visibleStart) {
      setVisibleStart(newStart);
      dragRef.current.startIdx = newStart;
      dragRef.current.startX = e.clientX;
    }
  }, [data.length, visibleCount, visibleStart]);

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
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 hidden rounded border px-2.5 py-1.5"
        style={{ background: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder }}
      />
    </div>
  );
}
