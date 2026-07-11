"use client";

import { useEffect, useState, useRef } from "react";

function getSentiment(): number {
  if (typeof window === "undefined") return 0;
  const changes = document.querySelectorAll("[data-change]");
  if (!changes.length) return 0;
  let sum = 0;
  changes.forEach((el) => {
    const val = parseFloat(el.getAttribute("data-change") ?? "0");
    if (!isNaN(val)) sum += val;
  });
  return sum / changes.length;
}

export function MarketGlow() {
  const [avgChange, setAvgChange] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const sample = () => {
      if (!mounted) return;
      setAvgChange(getSentiment());
      raf.current = requestAnimationFrame(sample);
    };
    raf.current = requestAnimationFrame(sample);
    return () => { mounted = false; cancelAnimationFrame(raf.current); };
  }, []);

  const t = Math.max(-1, Math.min(1, avgChange * 3));
  const hue = t >= 0 ? 145 : 0;
  const sat = 80 + Math.abs(t) * 20;
  const lig = 12 + Math.abs(t) * 8;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 animate-ambient-glow"
      style={{
        background: `radial-gradient(ellipse 90% 60% at 20% 10%, hsla(${hue}, ${sat}%, ${lig}%, 1) 0%, transparent 70%)`,
        transition: "background 2s ease",
      }}
      aria-hidden="true"
    />
  );
}
