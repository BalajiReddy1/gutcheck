"use client";

import { useEffect, useRef } from "react";
import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";

/**
 * Live tuning panel for the Gutcheck design system. Development only.
 *
 * Every control writes a CSS custom property on :root, so one panel drives the
 * whole app rather than a single component: anything using var(--lime) or
 * var(--dur-base) updates as you drag. The canvas plot cannot read CSS
 * variables, so a `gutcheck:tokens` event tells it to re-read its palette.
 *
 * "Copy CSS" puts the current values on the clipboard in the exact shape of the
 * :root block in globals.css, so a session of tuning can be committed.
 */

type Spring = { stiffness?: number; damping?: number; mass?: number };
type Easing = { duration?: number; ease?: [number, number, number, number] };

/**
 * Sample a damped spring into a CSS `linear()` easing. CSS has no spring
 * primitive, so the curve is simulated and emitted as sampled stops.
 */
function springToLinear(s: Spring): { easing: string; ms: number } {
  const k = s.stiffness ?? 420;
  const c = s.damping ?? 30;
  const m = s.mass ?? 1;

  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));

  const at = (t: number) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (
        1 -
        Math.exp(-zeta * w0 * t) *
          (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
      );
    }
    return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  };

  // Run until it settles inside a thousandth, capped so a floppy spring cannot
  // produce a multi-second transition.
  let settle = 2;
  for (let t = 0; t <= 2; t += 1 / 240) {
    if (Math.abs(1 - at(t)) < 0.001) {
      settle = t;
      break;
    }
  }
  settle = Math.max(0.08, Math.min(2, settle));

  const steps = 32;
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    stops.push(at((i / steps) * settle).toFixed(4));
  }
  return { easing: `linear(${stops.join(", ")})`, ms: Math.round(settle * 1000) };
}

const cubic = (e?: [number, number, number, number]) =>
  `cubic-bezier(${(e ?? [0.22, 1, 0.36, 1]).map((n) => n.toFixed(3)).join(", ")})`;

export default function DesignDialsPanel() {
  const latest = useRef<Record<string, string>>({});

  const p = useDialKit(
    "Gutcheck",
    {
      Palette: {
        paper: { type: "color", default: "#f2f1ec" },
        paperSunk: { type: "color", default: "#e9e7de" },
        ink: { type: "color", default: "#0e131a" },
        inkSoft: { type: "color", default: "#566371" },
        lime: { type: "color", default: "#c9f24d" },
        crimson: { type: "color", default: "#d3283c" },
      },
      Type: {
        displayMax: [8, 4, 14, 0.25],
        leading: [0.85, 0.7, 1.15, 0.01],
        // Hundredths of an em, so the slider reads in whole numbers.
        tracking: [-3.5, -8, 2, 0.1],
        bodySize: [17, 14, 20, 0.5],
      },
      Motion: {
        entrance: { type: "easing", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
        quick: [200, 60, 600, 10],
        slow: [640, 200, 1600, 20],
        marker: { type: "spring", stiffness: 420, damping: 30, mass: 1 },
      },
      Layout: {
        gutter: [4.5, 1.5, 10, 0.25],
      },
      copyCss: { type: "action", label: "Copy CSS" },
    },
    {
      id: "gutcheck-design",
      persist: true,
      onAction: () => {
        const css = Object.entries(latest.current)
          .map(([k, v]) => `  ${k}: ${v};`)
          .join("\n");
        navigator.clipboard?.writeText(`:root {\n${css}\n}`);
      },
    },
  );

  useEffect(() => {
    const ease = p.Motion.entrance as Easing;
    const spring = springToLinear(p.Motion.marker as Spring);
    const baseMs = Math.round((ease.duration ?? 0.34) * 1000);

    const vars: Record<string, string> = {
      "--paper": p.Palette.paper,
      "--paper-sunk": p.Palette.paperSunk,
      "--ink": p.Palette.ink,
      "--ink-soft": p.Palette.inkSoft,
      "--lime": p.Palette.lime,
      "--crimson": p.Palette.crimson,
      "--rule": `${p.Palette.ink}1f`,
      "--rule-firm": `${p.Palette.ink}3d`,
      "--fs-h1": `clamp(2.4rem, 0.25rem + 8vw, ${p.Type.displayMax}rem)`,
      "--lh-display": String(p.Type.leading),
      "--ls-display": `${(p.Type.tracking / 100).toFixed(4)}em`,
      "--fs-body": `${p.Type.bodySize}px`,
      "--dur-quick": `${p.Motion.quick}ms`,
      "--dur-base": `${baseMs}ms`,
      "--dur-slow": `${p.Motion.slow}ms`,
      "--dur-spring": `${spring.ms}ms`,
      "--ease-out": cubic(ease.ease),
      "--ease-spring": spring.easing,
      "--gut": `clamp(1.25rem, 4.2vw, ${p.Layout.gutter}rem)`,
    };

    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    latest.current = vars;

    // The canvas plot draws with literal colours and cannot read var().
    window.dispatchEvent(new Event("gutcheck:tokens"));
  }, [p]);

  return <DialRoot position="bottom-right" />;
}
