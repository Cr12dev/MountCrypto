"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LandingAnimations({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // Section reveal (title + subtitle)
      el.querySelectorAll("[data-gsap='section-reveal']").forEach((section) => {
        const label = section.querySelector("[data-gsap='label']");
        const title = section.querySelector("[data-gsap='title']");

        if (label) {
          gsap.from(label, {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          });
        }

        if (title) {
          gsap.from(title, {
            y: 25,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          });
        }
      });

      // Card stagger
      el.querySelectorAll("[data-gsap='card-stagger']").forEach((container) => {
        const cards = container.children;
        if (!cards.length) return;
        gsap.from(cards, {
          y: 24,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, el);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
