"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { AsciiMountains } from "./AsciiMountains";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const contentWrapRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvasWrap = canvasWrapRef.current;
    const contentWrap = contentWrapRef.current;
    if (!section || !canvasWrap || !contentWrap) return;

    // ── Entrance (one-time on load) ──
    const entrance = gsap.timeline({ defaults: { ease: "power2.out" } });
    entrance
      .fromTo(
        wordmarkRef.current,
        { y: 40, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8 },
      )
      .fromTo(taglineRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3")
      .fromTo(ctaRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.15")
      .fromTo(
        statsRef.current?.children ?? [],
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 },
        "-=0.1",
      );

    // ── Scroll-driven hero pin + reveal ──
    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
      defaults: { ease: "none" },
    });

    scrollTl
      .to(contentWrap, { yPercent: -150 }, 0)
      .to(canvasWrap, { scale: 2.2 }, 0)
      .to(contentWrap, { opacity: 0.6 }, 0.5)
      .to(canvasWrap, { opacity: 0.6 }, 0.5);

    return () => {
      entrance.kill();
      scrollTl.scrollTrigger?.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-b border-border/20"
    >
      {/* Mountains canvas — wraps for scaling */}
      <div
        ref={canvasWrapRef}
        className="absolute inset-0 flex items-center justify-center [transform-origin:center_center]"
      >
        <AsciiMountains />
      </div>

      {/* Content — slides up on scroll */}
      <div
        ref={contentWrapRef}
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center"
      >
        <h1
          ref={wordmarkRef}
          className="font-display text-[clamp(2.5rem,8vw,6rem)] font-semibold leading-none tracking-[-0.03em] text-text-primary"
        >
          MOUNTCRYPTO
        </h1>
        <p
          ref={taglineRef}
          className="mt-4 text-[clamp(0.85rem,2vw,1.2rem)] font-light leading-relaxed text-text-secondary"
        >
          Markets at a glance — stocks, crypto, forex, and commodities in one place.
        </p>
        <div ref={ctaRef} className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded bg-accent px-5 py-2.5 text-xs font-medium text-white transition-all hover:bg-accent/90"
          >
            Start free
          </Link>
          <a
            href="#demo"
            className="rounded border border-border px-5 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
          >
            See demo
          </a>
        </div>

        <div
          ref={statsRef}
          className="mt-16 flex items-center justify-center gap-8 font-mono text-xs md:gap-12"
        >
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">$2.4T</p>
            <p className="mt-0.5 tracking-[0.08em] text-text-secondary">DAILY VOLUME</p>
          </div>
          <div className="h-8 w-px bg-border/40" />
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">10k+</p>
            <p className="mt-0.5 tracking-[0.08em] text-text-secondary">ASSETS</p>
          </div>
          <div className="h-8 w-px bg-border/40" />
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">50k+</p>
            <p className="mt-0.5 tracking-[0.08em] text-text-secondary">TRADERS</p>
          </div>
        </div>
      </div>
    </section>
  );
}
