"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Three steps, told as a sticky index rather than a row of feature cards.
 *
 * The numeral is pinned and swaps through a blurred vertical cut as each step
 * takes over. The steps themselves sit at different depths on the right so the
 * column never falls into the symmetrical rhythm that gives a template away.
 */

const STEPS = [
  {
    n: "01",
    h: "Write it down before you know.",
    p: "Journal in plain language. Gemini reads the entry back, names the pattern it sees, and asks one question instead of agreeing with you.",
    k: "Entry",
  },
  {
    n: "02",
    h: "Put a number on it.",
    p: "When an entry is really a decision, log the call: the reasoning, a prediction specific enough to be wrong, and how sure you actually feel.",
    k: "Call",
  },
  {
    n: "03",
    h: "Come back and be scored.",
    p: "On the review date the decision returns. You record what happened, and your Brier score and signed bias move whether you like it or not.",
    k: "Verdict",
  },
];

export default function Loop() {
  const [active, setActive] = useState(0);
  const [tracking, setTracking] = useState(false);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        setTracking(true);
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-loop" data-tracking={tracking || undefined} aria-label="How it works">
      <div className="lp-loop-index">
        <div className="lp-loop-sticky">
          <span className="cap">How it works</span>
          <div className="lp-numeral" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.n} data-on={i === active || undefined}>
                {s.n}
              </span>
            ))}
          </div>
          <div className="lp-keys" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.k} className="cap" data-on={i === active || undefined}>
                {s.k}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-loop-steps">
        {STEPS.map((s, i) => (
          <div
            className="lp-step"
            key={s.n}
            data-i={i}
            data-on={i === active || undefined}
            ref={(el) => {
              steps.current[i] = el;
            }}
          >
            <h3 className="h2">{s.h}</h3>
            <p className="lead">{s.p}</p>
          </div>
        ))}
      </div>

      <style>{`
        .lp-loop {
          display: grid;
          grid-template-columns: minmax(0, 38%) minmax(0, 1fr);
          border-top: 1px solid var(--rule-firm);
        }
        .lp-loop-index { border-right: 1px solid var(--rule); }
        .lp-loop-sticky {
          position: sticky; top: 0; height: 100vh;
          display: grid; align-content: center; gap: 1.25rem;
          padding-inline: var(--gut) clamp(1rem, 2vw, 2rem);
        }

        .lp-numeral {
          position: relative;
          height: clamp(7rem, 17vw, 15rem);
          font-family: var(--font-display);
          font-size: clamp(7rem, 17vw, 15rem);
          font-weight: 800; line-height: 1; letter-spacing: -0.05em;
        }
        .lp-numeral span {
          position: absolute; inset: 0;
          opacity: 0; filter: blur(10px); transform: translateY(0.22em);
          transition: opacity var(--dur-base) var(--ease-out),
                      filter var(--dur-base) var(--ease-out),
                      transform var(--dur-base) var(--ease-out);
        }
        .lp-numeral span[data-on] { opacity: 1; filter: blur(0); transform: none; }

        .lp-keys { display: flex; gap: 1.5rem; }
        .lp-keys span {
          position: relative; padding-bottom: 0.4rem;
          color: color-mix(in oklab, var(--ink) 30%, transparent);
          transition: color var(--dur-base) var(--ease-out);
        }
        .lp-keys span[data-on] { color: var(--ink); }
        .lp-keys span::after {
          content: ""; position: absolute; left: 0; bottom: 0; height: 2px; width: 100%;
          background: var(--ink);
          transform: scaleX(0); transform-origin: left;
          transition: transform var(--dur-base) var(--ease-out);
        }
        .lp-keys span[data-on]::after { transform: scaleX(1); }

        .lp-loop-steps { display: grid; }
        .lp-step {
          min-height: 85vh;
          display: grid; align-content: center; gap: 1.5rem;
          padding: 6rem clamp(1.25rem, 5vw, 7rem);
          border-bottom: 1px solid var(--rule);
          transition: opacity var(--dur-slow) var(--ease-out);
        }
        .lp-step:last-child { border-bottom: 0; }
        [data-tracking] .lp-step { opacity: 0.38; }
        [data-tracking] .lp-step[data-on] { opacity: 1; }
        /* Break the symmetry: each step sits at a different depth. */
        .lp-step:nth-child(2) { padding-left: clamp(2.5rem, 9vw, 11rem); }
        .lp-step:nth-child(3) { padding-left: clamp(1.75rem, 7vw, 9rem); }
        .lp-step .h2 { max-width: 15ch; }

        @media (max-width: 860px) {
          .lp-loop { grid-template-columns: 1fr; }
          .lp-loop-index { border-right: 0; border-bottom: 1px solid var(--rule); }
          .lp-loop-sticky { height: auto; padding-block: 3rem; }
          .lp-numeral { height: 6rem; font-size: 6rem; }
          .lp-step { min-height: auto; padding: 4rem var(--gut) !important; opacity: 1; }
        }
      `}</style>
    </section>
  );
}
