"use client";

import { useEffect, useRef } from "react";

// 35+ shade characters for smooth gradient
const SHADES = [
  " ", ".", "·", "`", ",", "-", "~", ":", ";", "!", "|", "i", "t",
  "v", "x", "z", "s", "o", "O", "Q", "B", "E", "G", "S",
  "#", "▒", "▓", "█", "▲",
];

const SNOW = [" ", "·", ".", "•", "*", "✦", "▲"];

export function AsciiMountains() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let cols: number;
    let rows: number;
    const CHAR_H = 10;
    const CHAR_W = 5.8;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / CHAR_W);
      rows = Math.ceil(canvas.height / CHAR_H);
    }

    resize();
    window.addEventListener("resize", resize);

    // Star field
    const stars: { x: number; y: number; phase: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        size: Math.random(),
        brightness: 0.3 + Math.random() * 0.7,
      });
    }

    // Mountain height profile — layered sine terrain + gaussian peaks
    function mountainHeight(px: number, time: number): number {
      const x = px / cols;

      // Base terrain — 10 sine layers for organic detail
      const terrain =
        Math.sin(x * 1.2 + Math.sin(time * 0.00005) * 0.02) * 0.22 +
        Math.sin(x * 2.7 + time * 0.00003) * 0.14 +
        Math.sin(x * 5.3 + Math.sin(time * 0.00007) * 0.03) * 0.10 +
        Math.sin(x * 9.1) * 0.07 +
        Math.sin(x * 15.7 + time * 0.00004) * 0.05 +
        Math.sin(x * 24.3) * 0.035 +
        Math.sin(x * 40.1) * 0.025 +
        Math.sin(x * 67.0) * 0.018 +
        Math.sin(x * 110.3) * 0.012 +
        Math.sin(x * 180.0 + time * 0.00002) * 0.008;

      // 14 Gaussian peaks — realistic mountain range
      const peaks: [number, number, number][] = [
        // name: [position, sharpness, height] (height 0-1)
        // Far left cluster
        [0.03, 280, 0.18],
        [0.07, 350, 0.22],
        // Vignemale massif
        [0.12, 320, 0.28],
        [0.16, 400, 0.20],
        // Monte Perdido massif
        [0.24, 450, 0.30],
        [0.28, 500, 0.38],
        [0.32, 380, 0.26],
        // Central gorge
        [0.40, 200, 0.12],
        // Aneto — highest
        [0.52, 380, 0.48],
        [0.56, 350, 0.42],
        [0.61, 300, 0.28],
        // Posets massif
        [0.72, 320, 0.32],
        [0.76, 400, 0.35],
        [0.81, 350, 0.24],
        // Far right
        [0.90, 300, 0.20],
        [0.95, 250, 0.14],
      ];

      let peakSum = 0;
      for (const [pos, sharp, height] of peaks) {
        const dx = x - pos + Math.sin(time * 0.00003 + pos * 10) * 0.002;
        peakSum += Math.exp(-(dx ** 2) * sharp) * height;
      }

      // Ridges connecting peaks
      let ridgeSum = 0;
      const ridgePositions = [0.05, 0.14, 0.26, 0.42, 0.54, 0.74, 0.88];
      for (let i = 0; i < ridgePositions.length; i++) {
        const px2 = ridgePositions[i];
        const dx = x - px2;
        const width = 800;
        ridgeSum += Math.exp(-(dx ** 2) * width) * 0.06;
      }

      // Valley floor
      const valleyFloor = 0.04;

      const raw = terrain * 0.3 + peakSum + ridgeSum + valleyFloor;
      return Math.max(0, Math.min(1, raw));
    }

    // Snow line — higher on steeper slopes, varies with position
    function snowLine(x: number): number {
      // Snow line is lower on north-facing slopes (simulated)
      const slopeFactor = 0.7 + Math.sin(x * 7.3) * 0.3;
      return 0.62 + (1 - slopeFactor) * 0.12;
    }

    // Forest characters — dense to sparse
    const FOREST_CHARS = [" ", ".", ",", "~", "φ", "ψ", "µ", "♣", "♥", "♠", "æ", "ø", "ß", "Ω", "█", "▓", "▒"];
    // Grass chars for ground
    const GRASS_CHARS = [" ", " ", ".", ",", "~", "~", ":", ";"];

    // Cloud layer
    const clouds: { x: number; y: number; w: number; speed: number; density: number }[] = [];
    for (let i = 0; i < 12; i++) {
      clouds.push({
        x: Math.random(),
        y: 0.08 + Math.random() * 0.15,
        w: 0.08 + Math.random() * 0.25,
        speed: 0.0001 + Math.random() * 0.0003,
        density: 0.3 + Math.random() * 0.5,
      });
    }

    function draw(time: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${CHAR_H}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";

      const horizonRow = rows * 0.88;
      const scrollOffset = (time * 0.0003) % cols;

      // ── SKY: gradient background ──
      for (let r = 0; r < Math.floor(horizonRow); r++) {
        const t = r / horizonRow;
        const alpha = 0.003 + t * 0.008;
        ctx.fillStyle = `rgba(180,190,210,${alpha})`;
        ctx.fillText("·", 0, r * CHAR_H);
      }

      // ── STARS ──
      for (const star of stars) {
        const twinkle = (Math.sin(time * 0.001 + star.phase * 3) + 1) * 0.5;
        if (twinkle > 0.2) {
          const sx = star.x * canvas.width;
          const sy = star.y * canvas.height;
          const alpha = (twinkle - 0.2) * star.brightness * 0.35;
          ctx.fillStyle = `rgba(220,230,255,${alpha})`;
          const char = star.size > 0.6 ? "✦" : star.size > 0.3 ? "*" : "·";
          ctx.fillText(char, sx, sy);
        }
      }

      // ── MOON with glow ──
      const moonX = ((time * 0.00015 + 0.3) % 1.4) - 0.2;
      const moonY = 0.10 + Math.sin(time * 0.00008) * 0.025;
      const moonCX = moonX * canvas.width;
      const moonCY = moonY * canvas.height;

      // Glow layers
      for (let g = 3; g >= 0; g--) {
        ctx.fillStyle = `rgba(220,230,250,${0.07 - g * 0.015})`;
        ctx.fillText("☽", moonCX - g * CHAR_W * 0.5, moonCY - g * CHAR_H * 0.3);
      }
      ctx.fillStyle = "rgba(240,242,255,0.35)";
      ctx.fillText("☽", moonCX, moonCY);

      // ── CLOUDS ──
      for (const cloud of clouds) {
        const cx = ((cloud.x + time * cloud.speed) % 1.2) - 0.1;
        const cy = cloud.y * canvas.height;
        const cw = cloud.w * canvas.width;
        const segs = Math.floor(cw / (CHAR_W * 1.5));
        for (let s = 0; s < segs; s++) {
          const px2 = cx * canvas.width + s * CHAR_W * 1.5;
          const v = Math.sin(s / segs * Math.PI);
          const alpha = v * cloud.density * 0.12;
          ctx.fillStyle = `rgba(200,210,230,${alpha})`;
          ctx.fillText("░", px2, cy + Math.sin(s * 0.8) * CHAR_H * 0.5);
        }
      }

      // ── MOUNTAINS ──
      // Pre-compute heights for lighting
      const heights = new Float64Array(cols);
      for (let col = 0; col < cols; col++) {
        const wx = (col + scrollOffset) % cols;
        heights[col] = mountainHeight(wx, time);
      }

      // Sun angle (from upper-left)
      const sunAngle = 0.5;
      const sunElevation = 0.7;

      for (let col = 0; col < cols; col++) {
        const wx = (col + scrollOffset) % cols;
        const h = heights[col];
        const peakRows = Math.floor(h * rows * 0.55);

        if (peakRows < 1) continue;

        // Slope for lighting
        const leftH = col > 0 ? heights[col - 1] : h;
        const rightH = col < cols - 1 ? heights[col + 1] : h;
        const slope = (rightH - leftH) * 8;
        const light = 0.4 + (slope * sunAngle + sunElevation) * 0.6;
        const clampedLight = Math.max(0, Math.min(1, light));

        const snowLineLocal = snowLine(wx);

        for (let r = 0; r < peakRows; r++) {
          const screenRow = horizonRow - r;
          if (screenRow < 0 || screenRow >= rows) continue;

          const depth = r / peakRows;
          const elev = depth; // 0 = peak, 1 = base

          // Lighting with atmospheric perspective
          const atmosFade = 1 - depth * 0.15;
          const lit = clampedLight * atmosFade;
          const brightness = Math.max(0, Math.min(0.9, lit));

          const shadeIdx = Math.floor(brightness * (SHADES.length - 3));

          let char: string;

          if (elev >= snowLineLocal) {
            const snowIdx = Math.floor((1 - brightness) * (SNOW.length - 1));
            char = SNOW[Math.min(snowIdx, SNOW.length - 1)];
          } else {
            // Forest gradient: starts sparse at treeLine, dense at base
            const forestDensity = Math.max(0, Math.min(1, (elev - 0.10) / 0.55));
            const noise = Math.sin(col * 1.3 + r * 2.7 + 0.5) * 0.5 + 0.5;
            const threshold = 1 - forestDensity;

            if (depth < 0.10) {
              char = Math.sin(col * 0.5 + r * 1.3) > 0.3 ? "/" : "\\";
            } else if (forestDensity > 0.7 && noise > threshold) {
              // Dense forest — tree characters
              const treeIdx = Math.floor(forestDensity * (FOREST_CHARS.length - 1));
              char = FOREST_CHARS[Math.min(treeIdx, FOREST_CHARS.length - 1)];
            } else if (forestDensity > 0.35 && noise > threshold * 1.3) {
              // Medium forest
              const mix = (forestDensity - 0.35) / 0.35;
              const grad = Math.max(0, Math.min(SHADES.length - 4, shadeIdx));
              const useForest = Math.sin(col * 0.9 + r * 1.1) > 1 - mix * 1.5;
              char = useForest
                ? FOREST_CHARS[Math.floor(mix * 4) + 2]
                : SHADES[grad + 3];
            } else {
              // Sparse or bare ground — shade chars only
              const grad = Math.max(0, Math.min(SHADES.length - 4, shadeIdx));
              char = SHADES[grad + 3];
            }
          }

          // Snow on peaks reflects moonlight
          let extraGlow = 0;
          if (elev >= snowLineLocal && depth < 0.3) {
            extraGlow = (1 - depth / 0.3) * 0.12;
          }

          const baseAlpha = 0.05 + depth * 0.15;
          const alpha = Math.min(0.25, baseAlpha + extraGlow);
          ctx.fillStyle = `rgba(190,205,230,${alpha})`;
          ctx.fillText(char, col * CHAR_W, screenRow * CHAR_H);
        }
      }

      // ── FOREGROUND: smooth grass gradient at base ──
      for (let col = 0; col < cols; col++) {
        for (let r = 0; r < 5; r++) {
          const screenRow = horizonRow + r;
          if (screenRow >= rows) continue;
          const fade = 1 - r / 5;
          const grassNoise = Math.sin(col * 0.4 + r * 1.7 + 3) * 0.5 + 0.5;
          const charIdx = Math.floor(fade * grassNoise * (GRASS_CHARS.length - 1));
          const char = GRASS_CHARS[Math.min(charIdx, GRASS_CHARS.length - 1)];
          const alpha = (0.03 + r * 0.02) * fade;
          ctx.fillStyle = `rgba(180,195,220,${alpha})`;
          ctx.fillText(char, col * CHAR_W, screenRow * CHAR_H);
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ascii-mountains-canvas pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
