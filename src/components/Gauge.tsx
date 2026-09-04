"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Calibration gauge. The needle rests at centre when stated confidence matches
 * observed outcomes and swings toward UNDER or OVER as a signed bias builds up.
 * bias ~= mean(stated confidence - observed rate), -1..1.
 *
 * `tone` picks the surface it is drawn on: bone paper, or an ink band where the
 * dial goes lime.
 */
export default function Gauge({
  bias,
  brier,
  count,
  compact = false,
  tone = "paper",
}: {
  bias: number;
  brier: number | null;
  count: number;
  compact?: boolean;
  tone?: "paper" | "ink";
}) {
  const target = Math.max(-1, Math.min(1, bias * 3)) * 62;
  const [angle, setAngle] = useState(0);
  const [shown, setShown] = useState(0);
  const raf = useRef<number>(0);
  const fig = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  // Hold the needle at rest until the dial is actually looked at, so the swing
  // reads as a measurement being taken rather than a page load artefact.
  useEffect(() => {
    const el = fig.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    // The reading is information, not decoration: if the observer never
    // delivers, take it anyway rather than leaving a wrong number on screen.
    const fallback = setTimeout(() => setArmed(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!armed) return;
    const to = brier ?? 0;
    const settle = () => {
      setAngle(target);
      setShown(to);
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }
    const DUR = 1150;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      // Overshoot once and settle: a real needle does not glide into place.
      const e =
        t === 1 ? 1 : 1 - Math.pow(2, -9 * t) * Math.cos((t * 8.2 - 0.35) * Math.PI * 0.5);
      setAngle(target * e);
      setShown(to * Math.min(1, t * 1.15));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // A backgrounded tab stops serving frames, which would strand the readout
    // part-way. The dial must end on the right number either way.
    const guard = setTimeout(settle, DUR + 120);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(guard);
    };
  }, [target, brier, armed]);

  const ink = tone === "ink";
  const track = ink ? "#eceade26" : "var(--rule)";
  const scale = ink ? "#eceade40" : "var(--rule-firm)";
  const cap = ink ? "var(--on-ink-dim)" : "var(--ink-soft)";
  const needle = ink ? "var(--lime)" : "var(--ink)";
  const hub = ink ? "var(--ink)" : "var(--paper)";
  const arcOver = "var(--crimson)";
  const arcUnder = ink ? "#eceade59" : "var(--ink-soft)";

  return (
    <figure
      ref={fig}
      className="gauge"
      data-tone={tone}
      // Per-instance values ride on the element. Interpolating them into the
      // <style> block let a second gauge on the page restyle the first.
      style={
        {
          "--gauge-max": compact ? "11rem" : "22rem",
          "--gauge-fig": compact ? "1.35rem" : "2rem",
          "--gauge-ink": ink ? "var(--lime)" : "var(--ink)",
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 220 132" width="100%" role="img" aria-label={`Calibration gauge, bias ${bias.toFixed(2)}`}>
        <path d={arc(110, 112, 86, -180, -118)} stroke={arcUnder} strokeWidth="3" fill="none" />
        <path d={arc(110, 112, 86, -118, -62)} stroke={track} strokeWidth="3" fill="none" />
        <path d={arc(110, 112, 86, -62, 0)} stroke={arcOver} strokeWidth="3" fill="none" />
        {!compact &&
          Array.from({ length: 21 }, (_, i) => {
            const a = -180 + i * 9;
            const major = i % 5 === 0;
            const o = polar(110, 112, 82, a);
            const n = polar(110, 112, major ? 68 : 75, a);
            return (
              <line key={i} x1={n.x} y1={n.y} x2={o.x} y2={o.y} stroke={scale} strokeWidth={major ? 1.3 : 0.7} />
            );
          })}
        <g transform={`rotate(${angle} 110 112)`}>
          <line x1="110" y1="112" x2="110" y2="30" stroke={needle} strokeWidth="2.5" />
          <line x1="110" y1="112" x2="110" y2="123" stroke={needle} strokeWidth="2.5" />
        </g>
        <circle cx="110" cy="112" r="4.5" fill={hub} stroke={needle} strokeWidth="2.5" />
        <text x="6" y="128" fill={cap} className="g-cap">UNDER</text>
        <text x="214" y="128" textAnchor="end" fill={cap} className="g-cap">OVER</text>
      </svg>

      <div className="gauge-read">
        <span className="num gauge-fig">{brier === null ? "—.——" : shown.toFixed(3)}</span>
        <span className="cap">
          Brier &middot; {count} resolved
        </span>
      </div>

      <style>{`
        .gauge { margin: 0; display: grid; gap: 0.5rem; max-width: var(--gauge-max); }
        .gauge svg { display: block; }
        .g-cap {
          font-family: var(--font-mono); font-size: 7.5px;
          letter-spacing: 0.16em; font-weight: 500;
        }
        .gauge-read { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
        .gauge-fig {
          font-size: var(--gauge-fig);
          font-weight: 700; line-height: 1; letter-spacing: -0.02em;
          color: var(--gauge-ink);
        }
      `}</style>
    </figure>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const p1 = polar(cx, cy, r, a1);
  const p2 = polar(cx, cy, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}
