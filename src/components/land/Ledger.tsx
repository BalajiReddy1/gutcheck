"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "motion/react";

/**
 * The record, read sideways.
 *
 * Vertical scroll drives the ledger horizontally past a fixed read line. Each
 * call resolves as it crosses: the verdict rule draws itself and the outcome
 * arrives. It is one long ruled sheet, not a row of cards, so the eye reads it
 * as a continuous record rather than a set of options.
 */

const CALLS = [
  { n: "042", said: "Move piano practice to 6am so it survives busy weeks.", conf: 80, out: "Held nine days, then slipped.", ok: false },
  { n: "041", said: "Ship the beta without the CSV import.", conf: 75, out: "Nobody asked for it in six weeks.", ok: true },
  { n: "039", said: "Turn down the retainer and keep the mornings.", conf: 60, out: "Revenue flat, sleep up.", ok: true },
  { n: "036", said: "Take two weeks off right before the launch.", conf: 90, out: "Came back to a broken build.", ok: false },
  { n: "033", said: "Hire the generalist over the specialist.", conf: 65, out: "Shipped three surfaces in a quarter.", ok: true },
  { n: "029", said: "Say no to the podcast, protect the deep work.", conf: 55, out: "Regretted it by March.", ok: false },
];

export default function Ledger() {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outer,
    offset: ["start start", "end end"],
  });

  // The track is wider than the viewport; scroll pulls it left by the overflow.
  // The distance has to be a real number: a `calc()` keyframe cannot be
  // interpolated and motion would just snap to the end value.
  const [over, setOver] = useState(0);
  const x = useTransform(scrollYProgress, [0, 1], [0, -over]);

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const measure = () =>
      setOver(Math.max(0, t.scrollWidth - document.documentElement.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      removeEventListener("resize", measure);
    };
  }, []);

  // Resolve each call as it clears the read line on the left third.
  useEffect(() => {
    const items = track.current?.querySelectorAll<HTMLElement>("[data-call]");
    if (!items) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.toggleAttribute("data-resolved", e.isIntersecting)),
      { rootMargin: "0px -22% 0px -30%" },
    );
    items.forEach((i) => io.observe(i));
    // Reveal-on-cross is an enhancement. If the observer never fires, the
    // outcomes still have to be readable.
    const fallback = setTimeout(() => {
      if (!track.current?.querySelector("[data-resolved]"))
        items.forEach((i) => i.setAttribute("data-resolved", ""));
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <section className="lg" ref={outer} aria-label="Recent decisions">
      <div className="lg-stick">
        <header className="lg-head bleed">
          <span className="cap">Sample record</span>
          <span className="cap">57 resolved</span>
        </header>

        <motion.div className="lg-track" ref={track} style={{ x }}>
          {CALLS.map((c) => (
            <article className="lg-call" data-call key={c.n}>
              <div className="lg-meta">
                <span className="cap num">No. {c.n}</span>
                <span className="num lg-conf">
                  {c.conf}
                  <i>%</i>
                </span>
              </div>
              <p className="lg-said">{c.said}</p>
              <div className="lg-out">
                <span className="lg-verdict" data-ok={c.ok || undefined}>
                  {c.ok ? "Called it" : "Missed"}
                </span>
                <p>{c.out}</p>
              </div>
            </article>
          ))}
          <article className="lg-call lg-call--end" data-call>
            <p className="h3">
              Six decisions in, the pattern is already{" "}
              <span className="serif-em">clear.</span>
            </p>
          </article>
        </motion.div>

        <div className="lg-readline" aria-hidden="true" />
      </div>

      <style>{`
        .lg { height: 240vh; position: relative; background: var(--paper-sunk); }
        .lg-stick {
          position: sticky; top: 0; height: 100vh;
          display: grid; grid-template-columns: 100%; grid-template-rows: auto 1fr;
          align-content: center; overflow: hidden;
        }
        .lg-head {
          display: flex; justify-content: space-between; align-items: baseline;
          padding-block: clamp(1.5rem, 4vh, 3rem) 1rem;
        }
        .lg-track {
          display: flex; align-items: stretch; width: max-content;
          border-top: 1px solid var(--rule-firm);
          border-bottom: 1px solid var(--rule-firm);
          will-change: transform;
        }
        .lg-call {
          flex: 0 0 auto;
          width: clamp(20rem, 34vw, 34rem);
          display: grid; grid-template-rows: auto 1fr auto;
          gap: clamp(1.25rem, 3vh, 2.5rem);
          padding: clamp(1.5rem, 4vh, 3rem) clamp(1.25rem, 2.5vw, 3rem);
          border-right: 1px solid var(--rule);
        }
        .lg-call:first-child { padding-left: var(--gut); }

        .lg-meta { display: flex; justify-content: space-between; align-items: baseline; }
        .lg-conf {
          font-size: clamp(2.5rem, 4.5vw, 4.25rem); font-weight: 700; line-height: 1;
          letter-spacing: -0.04em;
        }
        .lg-conf i { font-style: normal; font-size: 0.42em; opacity: 0.45; margin-left: 0.1em; }

        .lg-said {
          font-family: var(--font-display);
          font-size: clamp(1.35rem, 1.9vw, 1.95rem);
          line-height: 1.18; letter-spacing: -0.02em;
        }

        .lg-out { display: grid; gap: 0.6rem; }
        .lg-out p {
          font-size: 0.9375rem; color: var(--ink-soft);
          opacity: 0; transform: translateY(0.5rem);
          transition: opacity var(--dur-base) var(--ease-out) 160ms,
                      transform var(--dur-base) var(--ease-out) 160ms;
        }
        [data-resolved] .lg-out p { opacity: 1; transform: none; }

        .lg-verdict {
          position: relative; justify-self: start;
          font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          padding-bottom: 0.3rem; color: var(--crimson);
        }
        .lg-verdict[data-ok] { color: var(--ink); }
        /* The rule strikes through as the call resolves. */
        .lg-verdict::after {
          content: ""; position: absolute; left: 0; bottom: 0;
          height: 3px; width: 100%; background: var(--crimson);
          transform: scaleX(0); transform-origin: left;
          transition: transform var(--dur-slow) var(--ease-out);
        }
        .lg-verdict[data-ok]::after { background: var(--lime); }
        [data-resolved] .lg-verdict::after { transform: scaleX(1); }

        .lg-call--end {
          width: clamp(22rem, 40vw, 40rem);
          align-content: center; border-right: 0;
          padding-right: var(--gut);
        }
        .lg-call--end .h3 { max-width: 22ch; }

        .lg-readline {
          position: absolute; left: 30%; top: 0; bottom: 0; width: 1px;
          background: linear-gradient(var(--rule), transparent);
          pointer-events: none;
        }

        @media (max-width: 720px) {
          .lg { height: 220vh; }
          .lg-call { width: 82vw; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lg-out p { opacity: 1; transform: none; }
          .lg-verdict::after { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
}
