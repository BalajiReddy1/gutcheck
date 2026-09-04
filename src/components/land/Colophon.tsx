"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Footer built on the oversized-wordmark pattern: the name set at the full
 * width of the page and clipped at the baseline, with the real links riding
 * above it.
 */
export default function Colophon() {
  const year = 2026;
  const markText = useRef<SVGTextElement>(null);
  // Natural bounds of the wordmark. Once the viewBox matches the glyphs, the
  // SVG scales itself to the container at every width, with no resize handling
  // and nothing to get stuck at a stale size.
  const [viewBox, setViewBox] = useState("0 0 1000 250");

  useEffect(() => {
    const t = markText.current;
    if (!t) return;
    const measure = () => {
      const b = t.getBBox();
      if (b.width > 0 && b.height > 0) {
        setViewBox(`${b.x} ${b.y} ${b.width} ${b.height}`);
      }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
  }, []);

  return (
    <footer className="cx">
      <div className="cx-cols bleed">
        <div className="cx-cell cx-cell--wide">
          <span className="cap">Gutcheck</span>
          <p className="cx-blurb">
            A private decision journal that keeps score. Write down the decisions
            you are unsure about, and find out how good your judgment really is.
          </p>
        </div>

        <nav className="cx-cell" aria-label="Product">
          <span className="cap">Product</span>
          <ul>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#how-it-works">Decision tracking</a></li>
            <li><a href="#how-it-works">Calibration score</a></li>
            <li><a href="#how-it-works">Mood trends</a></li>
          </ul>
        </nav>

        <nav className="cx-cell" aria-label="Built with">
          <span className="cap">Built with</span>
          <ul>
            <li><a href="https://ai.google.dev/" target="_blank" rel="noreferrer">Gemini</a></li>
            <li><a href="https://cloud.google.com/run" target="_blank" rel="noreferrer">Cloud Run</a></li>
            <li><a href="https://firebase.google.com/docs/firestore" target="_blank" rel="noreferrer">Firestore</a></li>
            <li><a href="https://nextjs.org" target="_blank" rel="noreferrer">Next.js</a></li>
          </ul>
        </nav>

        <div className="cx-cell" aria-label="Privacy">
          <span className="cap">Privacy</span>
          <ul className="cx-facts">
            <li><span className="num">100%</span> of entries private to your account</li>
            <li><span className="num">0</span> entries used for training</li>
            <li><span className="num">0</span> trackers or third-party analytics</li>
          </ul>
        </div>
      </div>

      <div className="cx-mark" aria-hidden="true">
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
          <text ref={markText} x="0" y="0" dominantBaseline="text-before-edge">
            Gutcheck
          </text>
        </svg>
      </div>

      <div className="cx-base bleed">
        <span className="cap">&copy; {year} Gutcheck</span>
        <span className="cap cx-by">
          Made with
          <svg viewBox="0 0 24 22" aria-hidden="true" focusable="false">
            <path d="M12 21.6 3.5 13a5.6 5.6 0 0 1 0-7.9 5.6 5.6 0 0 1 7.9 0l.6.6.6-.6a5.6 5.6 0 0 1 7.9 0 5.6 5.6 0 0 1 0 7.9Z" />
          </svg>
          <span className="sr-only">love</span>
          by Balaji Thukuntala
        </span>
      </div>

      <style>{`
        .cx { position: relative; border-top: 1px solid var(--rule-firm); overflow: hidden; }

        .cx-cols {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
          gap: clamp(1.5rem, 3vw, 4rem);
          padding-block: clamp(3rem, 7vh, 6rem) clamp(2rem, 5vh, 4rem);
        }
        .cx-cell { display: grid; gap: 1rem; align-content: start; }
        .cx-blurb { max-width: 32ch; color: var(--ink-soft); font-size: 0.9375rem; }

        .cx-cell ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
        .cx-cell a {
          color: var(--ink); text-decoration: none;
          font-size: 0.9375rem;
          background-image: linear-gradient(var(--ink), var(--ink));
          background-size: 0% 1px; background-position: 0 100%; background-repeat: no-repeat;
          transition: background-size var(--dur-base) var(--ease-out);
        }
        .cx-cell a:hover { background-size: 100% 1px; }
        .cx-cell a:visited { color: var(--ink-soft); }

        .cx-facts li { font-size: 0.9375rem; color: var(--ink-soft); }
        .cx-facts .num { color: var(--ink); font-weight: 700; margin-right: 0.3em; }

        /* The name, set to the page and cut off by the base rule. */
        .cx-mark {
          padding-inline: var(--gut);
          margin-bottom: -0.16em;
          overflow: hidden;
        }
        .cx-mark svg { display: block; width: 100%; height: auto; }
        .cx-mark text {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 100px;
          letter-spacing: -0.055em;
          fill: var(--ink);
        }

        .cx-by { display: inline-flex; align-items: center; gap: 0.4em; }
        .cx-by svg { width: 0.95em; height: 0.95em; fill: var(--crimson); }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip-path: inset(50%); white-space: nowrap;
        }

        .cx-base {
          display: flex; flex-wrap: wrap; gap: 0.75rem clamp(1rem, 4vw, 3rem);
          justify-content: space-between;
          padding-block: 1.25rem;
          border-top: 1px solid var(--rule);
        }

        @media (max-width: 860px) {
          .cx-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cx-cell--wide { grid-column: 1 / -1; }
        }
      `}</style>
    </footer>
  );
}
