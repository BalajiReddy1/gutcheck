"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Gauge from "@/components/Gauge";
import type { CalibrationSummary, Decision } from "@/lib/types";

const EMPTY = { statement: "", rationale: "", prediction: "", confidence: 70, reviewInDays: 21 };

export default function Decisions({ onCal }: { onCal?: (c: CalibrationSummary) => void }) {
  const { apiFetch } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [cal, setCal] = useState<CalibrationSummary | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback(
    (list: Decision[], c: CalibrationSummary) => {
      setDecisions(list);
      setCal(c);
      onCal?.(c);
    },
    [onCal],
  );

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/decisions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your decisions.");
      apply(data.decisions, data.calibration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your decisions.");
    } finally {
      setLoaded(true);
    }
  }, [apiFetch, apply]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (busy) return;
    if (!form.statement.trim() || !form.rationale.trim() || !form.prediction.trim()) {
      setError("Add the decision, your reasoning, and a concrete prediction.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/decisions", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That did not save.");
      setDecisions((p) => [data.decision, ...p]);
      setForm(EMPTY);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <div className="view-head">
        <h1>Decisions</h1>
        <span className="cap">
          {decisions.length} logged · {decisions.filter((d) => d.status === "resolved").length}{" "}
          resolved
        </span>
      </div>

      <div className="cols">
        <div className="hs-stack" style={{ gap: "clamp(1rem, 2vw, 1.5rem)" }}>
          <section className="hs-card card--pad-lg hs-stack" style={{ gap: "0.85rem" }}>
            <h2 className="h2" style={{ fontSize: "var(--fs-h3)" }}>
              Log a decision
            </h2>
            <p className="empty" style={{ fontSize: "var(--fs-sm)" }}>
              Something you are genuinely unsure about. Gemini stress-tests it now and brings
              it back on the review date.
            </p>
            <input
              className="hs-input"
              type="text"
              placeholder="The decision, in one line"
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
            />
            <textarea
              className="hs-input"
              rows={3}
              placeholder="Why. Your actual reasoning."
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
            />
            <textarea
              className="hs-input"
              rows={2}
              placeholder="Concrete prediction: what does success look like, and by when?"
              value={form.prediction}
              onChange={(e) => setForm({ ...form, prediction: e.target.value })}
            />
            <label className="hs-stack" style={{ gap: "0.5rem" }}>
              <span className="ctl-label">
                <span>Confidence</span>
                <strong className="num">{form.confidence}%</strong>
              </span>
              <input
                type="range"
                min={1}
                max={99}
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })}
              />
            </label>
            <label className="hs-stack" style={{ gap: "0.5rem" }}>
              <span className="ctl-label">
                <span>Review in</span>
                <strong className="num">{form.reviewInDays} days</strong>
              </span>
              <input
                type="range"
                min={3}
                max={120}
                value={form.reviewInDays}
                onChange={(e) => setForm({ ...form, reviewInDays: Number(e.target.value) })}
              />
            </label>
            {error && <div className="note note--warn">{error}</div>}
            <button className="btn-hs btn-hs--lime" onClick={submit} disabled={busy}>
              {busy ? "Stress-testing" : "Log decision"}
            </button>
          </section>

          {!loaded && <div className="bar" />}
          {loaded && decisions.length === 0 && (
            <p className="empty">No decisions logged yet.</p>
          )}
          {decisions.map((d) => (
            <DecisionCard key={d.id} d={d} onResolved={apply} />
          ))}
        </div>

        <aside className="hs-card hs-stack" style={{ gap: "0.85rem" }}>
          <span className="cap">Calibration</span>
          {!cal || cal.tendency === "not enough data" ? (
            <p className="empty" style={{ fontSize: "var(--fs-sm)" }}>
              Resolve at least three decisions to read the needle.{" "}
              <span className="num">{cal?.resolvedCount ?? 0}/3</span>
            </p>
          ) : (
            <>
              <Gauge bias={cal.bias} brier={cal.brier} count={cal.resolvedCount} />
              <div className="note note--info">
                You run <strong>{cal.tendency}</strong>. Lower Brier is better; 0.25 is a coin
                flip.
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function DecisionCard({
  d,
  onResolved,
}: {
  d: Decision;
  onResolved: (list: Decision[], cal: CalibrationSummary) => void;
}) {
  const { apiFetch } = useAuth();
  const [outcome, setOutcome] = useState("");
  const [went, setWent] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const due = Date.now() >= d.reviewDueAt;
  const state = d.status === "resolved" ? "done" : due ? "due" : "open";

  const resolve = async () => {
    if (!outcome.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/decisions/${d.id}`, {
        method: "PATCH",
        body: JSON.stringify({ outcome, wentAsPredicted: went }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That did not save.");
      onResolved(data.decisions, data.calibration);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="hs-card hs-stack" style={{ gap: "0.6rem" }}>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <h3 style={{ fontSize: "var(--fs-h3)" }}>{d.statement}</h3>
        <span className={`tag tag--${state === "done" ? "" : state}`}>
          {state === "done" ? "resolved" : state === "due" ? "review due" : "open"}
        </span>
      </div>
      <p className="muted" style={{ fontSize: "var(--fs-sm)", lineHeight: 1.5 }}>
        <span className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>
          {d.confidence}%
        </span>{" "}
        · {d.prediction}
      </p>

      {d.redTeam.length > 0 && (
        <div>
          <span className="cap">Stress test</span>
          <ul className="checklist">
            {d.redTeam.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {d.status === "resolved" ? (
        <div className="note">
          <span className="cap" style={{ display: "block", marginBottom: "0.25rem" }}>
            Outcome
          </span>
          {d.outcome}
        </div>
      ) : (
        <details open={due}>
          <summary className="cap" style={{ cursor: "pointer" }}>
            Record the outcome
          </summary>
          <div className="hs-stack" style={{ gap: "0.6rem", marginTop: "0.6rem" }}>
            <textarea
              className="hs-input"
              rows={2}
              placeholder="What actually happened?"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
            <label className="hs-stack" style={{ gap: "0.5rem" }}>
              <span className="ctl-label">
                <span>Went as predicted</span>
                <strong className="num">{Math.round(went * 100)}%</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={went}
                onChange={(e) => setWent(Number(e.target.value))}
              />
            </label>
            {err && <div className="note note--warn">{err}</div>}
            <button className="btn-hs" onClick={resolve} disabled={busy}>
              {busy ? "Saving" : "Save outcome"}
            </button>
          </div>
        </details>
      )}
    </section>
  );
}
