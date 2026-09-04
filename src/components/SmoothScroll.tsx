"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scrolling for the marketing page.
 *
 * The sticky sections read better when the wheel eases instead of snapping, but
 * this is a preference, not a requirement: anyone who has asked for reduced
 * motion gets the browser's native scrolling, untouched.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let raf = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        duration: 1.05,
        // Ease out hard so a flick settles rather than drifting.
        easing: (t) => 1 - Math.pow(1 - t, 4),
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        // Touch devices already have momentum scrolling of their own.
        syncTouch: false,
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
    };

    const sync = () => (reduce.matches ? stop() : start());
    sync();
    reduce.addEventListener("change", sync);

    return () => {
      reduce.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return null;
}
