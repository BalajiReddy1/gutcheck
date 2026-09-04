"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Gauge from "@/components/Gauge";
import Reliability from "@/components/land/Reliability";
import Ledger from "@/components/land/Ledger";
import Loop from "@/components/land/Loop";
import Colophon from "@/components/land/Colophon";
import SmoothScroll from "@/components/SmoothScroll";

/** What the record says about a stated confidence, in plain language. */
function verdict(c: number) {
  if (c >= 97) return "Almost nobody is right this often.";
  if (c >= 90) return "A strong claim. This record only gets there 74% of the time.";
  if (c >= 75) return "The most common range, and the most expensive one to be wrong in.";
  if (c >= 62) return "Realistic. Most well-kept records sit here.";
  return "Close to a coin flip. Still worth writing down.";
}

export default function Landing() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [conf, setConf] = useState(87);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const start = async () => {
    setPending(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
      setPending(false);
    }
  };

  const hit = Math.round(Math.max(0, conf - 19 * Math.sin((Math.PI * conf) / 100) - 0.04 * conf));

  return (
    <div className="lp">
      <SmoothScroll />
      {/* ---------------------------------------------------------- masthead */}
      <nav className="lp-nav bleed on-ink">
        <span className="lp-mark">
          Gutcheck
        </span>
        <a className="cap lp-nav-mid" href="#how-it-works">How it works</a>
        <button className="btn-hs btn-hs--ghost btn-hs--sm" onClick={start} disabled={pending || loading}>
          Sign in
        </button>
      </nav>

      {/* -------------------------------------------------------------- hero */}
      <header className="hs-hero on-ink">
        <h1 className="display hero-h1 bleed">
          <span className="reveal hero-figure" style={{ "--d": "60ms" } as React.CSSProperties}>
            You were <b className="num">{conf}</b>
            <i>%</i>
          </span>
          <span className="reveal" style={{ "--d": "150ms" } as React.CSSProperties}>
            sure. Gutcheck
          </span>
          <span className="reveal" style={{ "--d": "240ms" } as React.CSSProperties}>
            keeps <em className="serif-em">the receipt.</em>
          </span>
        </h1>

        <div className="hero-row bleed reveal" style={{ "--d": "380ms" } as React.CSSProperties}>
          <p className="lead">
            Write down the decisions you are unsure about and how confident you are.
            When the outcome arrives, Gutcheck scores it and shows you the pattern.
          </p>
          <div className="hero-cta">
            <button className="btn-hs btn-hs--lime" onClick={start} disabled={pending || loading}>
              {pending ? "Opening Google" : "Get started"}
            </button>
            <span className="cap hero-fine">
              Sign in with Google. Your entries stay private to your account.
            </span>
          </div>
          {error && (
            <p className="hero-error num" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* the instrument */}
        <div className="hero-instr bleed">
          <div className="hero-instr-head">
            <span className="cap">Sample record &middot; 57 resolved decisions</span>
            <p className="hero-verdict">
              At <b className="num">{conf}%</b> stated, this record was right{" "}
              <b className="num">{hit}%</b> of the time. {verdict(conf)}
            </p>
          </div>
          <Reliability value={conf} onChange={setConf} />
          <span className="cap hero-hint">Drag the rail</span>
        </div>
      </header>

      {/* ------------------------------------------------------------ record */}
      <Ledger />

      {/* -------------------------------------------------------------- loop */}
      <div id="how-it-works">
        <Loop />
      </div>

      {/* ------------------------------------------------------------ needle */}
      <section className="needle on-ink">
        <div className="needle-in bleed">
          <div className="needle-copy">
            <span className="cap">Your score</span>
            <h2 className="h2">
              One number you cannot
              <br />
              <em className="serif-em">argue with.</em>
            </h2>
            <p className="lead">
              One number for accuracy, one for direction. Resolve three decisions and
              Gutcheck starts telling you whether you run overconfident or under.
            </p>
            <button className="btn-hs btn-hs--lime" onClick={start} disabled={pending || loading}>
              {pending ? "Opening Google" : "Get started"}
            </button>
          </div>
          <div className="needle-dial">
            <Gauge bias={0.31} brier={0.184} count={57} tone="ink" />
            <dl className="needle-facts">
              <div>
                <dt className="cap">Bias</dt>
                <dd className="num">+0.31</dd>
              </div>
              <div>
                <dt className="cap">Tendency</dt>
                <dd className="num">Over</dd>
              </div>
              <div>
                <dt className="cap">Window</dt>
                <dd className="num">45 days</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <Colophon />

      <style>{`
        .lp { overflow-x: clip; }

        /* masthead */
        .lp-nav {
          position: relative; z-index: 3;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; height: 4.25rem;
          border-bottom: 1px solid var(--rule-ink);
        }
        .lp-mark {
          display: inline-flex; align-items: baseline; gap: 0.55rem;
          font-family: var(--font-display); font-weight: 700;
          font-size: 1.375rem; letter-spacing: -0.03em;
        }
        .lp-mark i {
          font-family: var(--font-mono); font-style: normal;
          font-size: 0.5rem; letter-spacing: 0.18em;
          color: var(--lime); transform: translateY(-0.55em);
        }
        .lp-nav-mid { display: none; }
        @media (min-width: 900px) { .lp-nav-mid { display: inline; } }

        /* hero */
        @media (max-height: 820px) and (min-width: 900px) {
          .hs-hero h1 { font-size: clamp(2.4rem, 6.4vw, 6rem); }
        }
        .hs-hero {
          min-height: calc(100vh - 4.25rem);
          display: grid; grid-template-rows: auto auto 1fr;
          align-content: start;
          padding-bottom: clamp(0.75rem, 2.5vh, 1.75rem);
        }

        .hero-h1 {
          display: grid; gap: 0.01em;
          padding-block: clamp(1rem, 3vh, 2.25rem) clamp(0.75rem, 2vh, 1.5rem);
        }
        .hero-h1 em { color: var(--lime); }
        .hero-figure { display: flex; align-items: baseline; }
        .hero-figure b {
          font-weight: 700; color: var(--lime);
          font-variant-numeric: tabular-nums;
          /* Hold the width so the headline never reflows while dragging. */
          min-width: 2.15ch; text-align: right;
          margin-left: 0.14em;
        }
        .hero-figure i {
          font-style: normal; color: var(--lime);
          font-size: 0.46em; align-self: flex-start;
          margin-top: 0.3em;
        }

        .hero-row {
          display: grid; gap: 1.5rem;
          align-items: end;
          padding-bottom: clamp(1rem, 2.75vh, 2rem);
        }
        @media (min-width: 900px) {
          .hero-row {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: clamp(2rem, 5vw, 6rem);
          }
        }
        .hero-cta {
          display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
        }
        .hero-fine { line-height: 1.6; max-width: 26ch; }
        .hero-error {
          font-size: 0.8125rem; color: var(--lime);
          border-left: 2px solid var(--crimson); padding-left: 0.75rem;
        }

        /* the instrument sits on the floor of the hero, full width */
        .hero-instr {
          position: relative; display: grid; gap: 0.6rem;
          align-self: end; align-content: end;
        }
        .hero-instr-head {
          display: grid; gap: 0.5rem;
          border-top: 1px solid var(--rule-ink); padding-top: 0.9rem;
        }
        .hero-verdict {
          font-size: 0.9375rem; color: var(--on-ink-dim); max-width: 68ch;
        }
        .hero-verdict b { color: var(--lime); font-weight: 500; }
        .hero-hint {
          position: absolute; right: var(--gut); bottom: 0.25rem;
          color: var(--lime);
        }
        /* Narrow viewports have no spare room beside the rail readout, so the
           hint drops below it instead of landing on top of the figure. */
        @media (max-width: 760px) {
          .hero-hint {
            position: static;
            justify-self: end;
            padding-top: 0.4rem;
          }
        }

        /* needle band */
        .needle { border-top: 1px solid var(--rule-firm); }
        .needle-in {
          display: grid; gap: clamp(2.5rem, 6vw, 6rem);
          padding-block: clamp(4rem, 11vh, 8rem);
          align-items: center;
        }
        @media (min-width: 900px) {
          .needle-in { grid-template-columns: minmax(0, 1fr) minmax(18rem, 26rem); }
        }
        .needle-copy { display: grid; gap: 1.5rem; justify-items: start; }
        .needle-copy .h2 em { color: var(--lime); }
        .needle-dial { display: grid; gap: 1.5rem; }
        .needle-facts {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 0;
          border-top: 1px solid var(--rule-ink); padding-top: 1rem;
        }
        .needle-facts div { display: grid; gap: 0.35rem; }
        .needle-facts dd {
          margin: 0; font-size: 1.05rem; font-weight: 500; color: var(--on-ink);
        }
      `}</style>
    </div>
  );
}
