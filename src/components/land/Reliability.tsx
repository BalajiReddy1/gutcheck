"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The hero instrument.
 *
 * It is an actual reliability diagram: stated confidence on x, observed hit
 * rate on y, with the diagonal marking perfect calibration. The plotted record
 * is a specimen, labelled as one, and it leans overconfident because that is
 * what almost every real record does.
 *
 * Dragging the rail sweeps a read head across the plot. The number in the
 * headline and the verdict underneath are both driven by that one gesture, so
 * the hero teaches what the product does instead of describing it.
 */

const N = 260;

/* Canvas cannot resolve var(), so the palette is read off :root and refreshed
   whenever the dial panel reports a change. */
const palette = { ink: "#0e131a", lime: "#c9f24d", bone: "#eceade" };

function readPalette() {
  if (typeof window === "undefined") return;
  const cs = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;
  palette.ink = pick("--ink", palette.ink);
  palette.lime = pick("--lime", palette.lime);
  palette.bone = pick("--on-ink", palette.bone);
}
/** Visible plot domain. The rail cannot reach below 50%, so nothing is drawn there. */
const X0 = 0.5;
const Y0 = 0.2;

type Dot = {
  /** plot position, 0..1 */
  x: number;
  y: number;
  /** live pixel offset from pointer push, springs back to zero */
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  r: number;
  hit: boolean;
};

/** Deterministic noise so the server and client agree and the plot never jumps. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Observed hit rate for a stated confidence. Sags below the diagonal in the
 *  middle: the signature shape of an overconfident forecaster. */
function observed(x: number) {
  return Math.max(0, Math.min(1, x - 0.19 * Math.sin(Math.PI * x) - 0.04 * x));
}

function buildDots(): Dot[] {
  const rand = rng(7);
  const dots: Dot[] = [];
  for (let i = 0; i < N; i++) {
    // Bias the sample toward the confident end, where people actually live.
    const x = 0.5 + Math.pow(rand(), 0.55) * 0.5;
    const spread = 0.13 * (1 - Math.abs(x - 0.75) * 0.9);
    const y = Math.max(0, Math.min(1, observed(x) + (rand() - 0.5) * spread * 2));
    dots.push({
      x,
      y,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      r: 1.1 + rand() * 1.5,
      hit: rand() < observed(x),
    });
  }
  return dots;
}

export default function Reliability({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<Dot[]>(null as unknown as Dot[]);
  const pointer = useRef({ x: -9999, y: -9999, on: false });
  const sweep = useRef(value / 100);
  const intro = useRef(0);
  const live = useRef(true);
  const [dragging, setDragging] = useState(false);

  if (dots.current === null) dots.current = buildDots();
  sweep.current = value / 100;

  /* ------------------------------------------------------------- the plot */
  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    if (!cv || !box) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    readPalette();
    window.addEventListener("gutcheck:tokens", readPalette);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = box.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const io = new IntersectionObserver(([e]) => (live.current = e.isIntersecting), {
      rootMargin: "400px 0px 400px 0px",
    });
    io.observe(box);

    // Plot area. It runs the full width of the section and is deliberately
    // wider than it is tall, so it reads as a chart rule, not a square widget.
    // The domain is clipped to the half of the scale the rail can reach, so no
    // part of the plot is dead space.
    const pad = () => ({ t: h * 0.08, b: h * 0.1 });

    const px = (x: number) => ((x - X0) / (1 - X0)) * w;
    const py = (y: number) => {
      const p = pad();
      const t = (y - Y0) / (1 - Y0);
      return h - p.b - t * (h - p.t - p.b);
    };

    const born = performance.now();

    const draw = (now: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      if (w < 2 || h < 2) return;

      intro.current = reduce ? 1 : Math.min(1, (now - born) / 900);
      const ease = 1 - Math.pow(1 - intro.current, 3);

      /* perfect-calibration diagonal */
      ctx.save();
      ctx.strokeStyle = `${palette.bone}59`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(px(X0), py(X0));
      ctx.lineTo(px(X0 + ease * (1 - X0)), py(X0 + ease * (1 - X0)));
      ctx.stroke();
      ctx.restore();

      /* the record's own curve, drawn in the accent */
      ctx.save();
      ctx.strokeStyle = palette.lime;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = X0 + (i / 60) * (1 - X0);
        if (i / 60 > ease) break;
        const X = px(t);
        const Y = py(observed(t));
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();

      /* the read head */
      const sx = px(sweep.current);
      ctx.save();
      ctx.globalAlpha = ease;
      ctx.strokeStyle = `${palette.lime}66`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, pad().t);
      ctx.lineTo(sx, h - pad().b);
      ctx.stroke();

      const oy = py(observed(sweep.current));
      ctx.fillStyle = palette.lime;
      ctx.fillRect(sx - 3.5, oy - 3.5, 7, 7);
      ctx.fillStyle = palette.ink;
      ctx.fillRect(sx - 1.5, oy - 1.5, 3, 3);
      ctx.restore();

      /* the plotted calls */
      const p = pointer.current;
      for (const d of dots.current) {
        const bx = px(d.x);
        const by = py(d.y);

        if (!reduce) {
          // Pointer pushes dots aside, a spring pulls them home. The record
          // resists being disturbed, which is the feeling I want here.
          if (p.on) {
            const dx = bx + d.ox - p.x;
            const dy = by + d.oy - p.y;
            const dist2 = dx * dx + dy * dy;
            const R = 130;
            if (dist2 < R * R && dist2 > 0.01) {
              const dist = Math.sqrt(dist2);
              const push = (1 - dist / R) * 34;
              d.vx += (dx / dist) * push * dt * 0.012;
              d.vy += (dy / dist) * push * dt * 0.012;
            }
          }
          const k = 0.011 * dt;
          d.vx += -d.ox * k;
          d.vy += -d.oy * k;
          const damp = Math.pow(0.88, dt / 16.67);
          d.vx *= damp;
          d.vy *= damp;
          d.ox += d.vx;
          d.oy += d.vy;
        }

        // Reveal the scatter left to right on load.
        if ((d.x - X0) / (1 - X0) > ease) continue;

        const near = Math.abs(d.x - sweep.current) < 0.045;
        const x = bx + d.ox;
        const y = by + d.oy;

        if (near) {
          ctx.fillStyle = palette.lime;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = d.hit ? palette.bone : `${palette.bone}00`;
          ctx.globalAlpha = d.hit ? 0.5 : 1;
        }

        if (d.hit) {
          ctx.fillRect(x - d.r, y - d.r, d.r * 2, d.r * 2);
        } else {
          // Missed calls are hollow. You can see the holes in the record.
          ctx.globalAlpha = near ? 1 : 0.45;
          ctx.strokeStyle = near ? palette.lime : palette.bone;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - d.r, y - d.r, d.r * 2, d.r * 2);
        }
        ctx.globalAlpha = 1;
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (live.current) draw(now, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const move = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, on: true };
    };
    const leave = () => (pointer.current.on = false);
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerleave", leave);
      window.removeEventListener("gutcheck:tokens", readPalette);
    };
  }, []);

  /* -------------------------------------------------------------- the rail */
  const rail = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = rail.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const t = (clientX - r.left) / r.width;
      onChange(Math.round(Math.max(0.5, Math.min(1, t)) * 100));
    },
    [onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromClientX]);

  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      onChange(Math.min(100, value + step));
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      onChange(Math.max(50, value - step));
      e.preventDefault();
    } else if (e.key === "Home") {
      onChange(50);
      e.preventDefault();
    } else if (e.key === "End") {
      onChange(100);
      e.preventDefault();
    }
  };

  const pos = ((value - 50) / 50) * 100;

  return (
    <div className="rel">
      <div className="rel-plot" ref={wrap}>
        <canvas ref={canvas} aria-hidden="true" />
        <span className="cap rel-yl">Actually right</span>
        <span className="cap rel-xl">Stated confidence</span>
      </div>

      <div
        className="rel-rail"
        ref={rail}
        role="slider"
        tabIndex={0}
        aria-label="Stated confidence"
        aria-valuemin={50}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value} percent confident`}
        onKeyDown={key}
        onPointerDown={(e) => {
          setDragging(true);
          setFromClientX(e.clientX);
        }}
        data-dragging={dragging || undefined}
      >
        <div className="rel-ticks" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} data-major={i % 5 === 0 || undefined} />
          ))}
        </div>
        <div className="rel-head" style={{ left: `${pos}%` }} aria-hidden="true">
          <span className="num">{value}</span>
        </div>
      </div>

      <style>{`
        .rel { display: grid; gap: 0; width: 100%; }
        .rel-plot {
          position: relative;
          height: clamp(118px, 18.5vh, 190px);
          touch-action: pan-y;
        }
        .rel-plot canvas { display: block; width: 100%; height: 100%; }
        .rel-yl, .rel-xl { position: absolute; font-size: 0.5625rem; letter-spacing: 0.2em; }
        .rel-yl { top: 0; left: 0; }
        .rel-xl { bottom: 0; right: 0; }

        .rel-rail {
          position: relative;
          height: 3.75rem;
          margin-top: 0.4rem;
          border-top: 1px solid var(--rule-ink);
          cursor: ew-resize;
          touch-action: none;
          user-select: none;
        }
        .rel-ticks {
          position: absolute; inset: 0 0 auto 0;
          display: flex; justify-content: space-between;
        }
        .rel-ticks i { width: 1px; height: 7px; background: var(--rule-ink); }
        .rel-ticks i[data-major] { height: 13px; background: var(--on-ink-dim); }

        .rel-head {
          position: absolute; top: -1px;
          transform: translateX(-50%);
          display: grid; justify-items: center; gap: 0.35rem;
          transition: left var(--dur-quick) var(--ease-out);
          will-change: left;
        }
        .rel-rail[data-dragging] .rel-head { transition: none; }
        .rel-head::before {
          content: ""; width: 2px; height: 1.5rem; background: var(--lime);
        }
        .rel-head .num {
          font-size: 1.25rem; font-weight: 700; color: var(--lime);
          font-variant-numeric: tabular-nums;
        }
        .rel-head .num::after { content: "%"; font-size: 0.65em; opacity: 0.7; }

        .rel-rail:focus-visible { outline-offset: 6px; }

        @media (max-width: 720px) {
          .rel-plot { height: 140px; }
        }
      `}</style>
    </div>
  );
}
