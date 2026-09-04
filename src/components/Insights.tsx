"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/AuthProvider";
import type { Digest } from "@/lib/types";

type MoodRow = { date: string; mood: number; energy: number; overwhelm: number };

const INK = "#0e131a";
const INK_SOFT = "#566371";
const RULE = "#0e131a1f";

const SERIES = [
  { key: "energy", label: "energy", color: INK, dash: undefined },
  { key: "mood", label: "mood", color: "#a8cf2c", dash: undefined },
  { key: "overwhelm", label: "overwhelm", color: "#d3283c", dash: "4 3" },
] as const;

export default function Insights() {
  const { apiFetch } = useAuth();
  const [series, setSeries] = useState<MoodRow[]>([]);
  const [signal, setSignal] = useState("");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [genBusy, setGenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([
        apiFetch("/api/mood?days=45"),
        apiFetch("/api/digest"),
      ]);
      const md = await m.json();
      const dd = await d.json();
      if (m.ok) {
        setSeries(md.series);
        setSignal(md.signal);
      }
      if (d.ok) setDigest(dd.digest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the plot.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const generateDigest = async () => {
    setGenBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/digest", {
        method: "POST",
        body: JSON.stringify({ days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not write the recap.");
      setDigest(data.digest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the recap.");
    } finally {
      setGenBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="view">
        <div className="bar" />
      </div>
    );
  }

  const flagged = /concern|down|declin|overwhelm|slide|flag|watch/i.test(signal);

  return (
    <div className="view">
      <div className="view-head">
        <h1>Trends</h1>
        <button className="btn-hs btn-hs--sm" onClick={generateDigest} disabled={genBusy}>
          {genBusy ? "Writing" : digest ? "Regenerate recap" : "Write this week"}
        </button>
      </div>

      {error && <div className="note note--warn">{error}</div>}

      <div className="cols">
        <section className="hs-card card--pad-lg hs-stack" style={{ gap: "0.85rem" }}>
          <div className={`note ${flagged ? "note--warn" : "note--info"}`}>
            {signal || "Log readings with a few entries to start the trace."}
          </div>
          {series.length > 0 ? (
            <>
              <div className="chart" style={{ height: "18rem", marginTop: "0.4rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ left: 0, right: 12, top: 8, bottom: 2 }}>
                    <CartesianGrid strokeWidth={1} vertical={false} stroke={RULE} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontFamily: "Tabular, monospace", fontSize: 10, fill: INK_SOFT }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={{ fontFamily: "Tabular, monospace", fontSize: 10, fill: INK_SOFT }}
                      tickLine={false}
                      axisLine={false}
                      width={26}
                    />
                    <Tooltip
                      cursor={{ stroke: INK_SOFT, strokeWidth: 1 }}
                      contentStyle={{
                        background: "#f2f1ec",
                        border: "1px solid #0e131a3d",
                        borderRadius: 0,
                        fontFamily: "Tabular, monospace",
                        fontSize: 11,
                      }}
                    />
                    {SERIES.map((s, i) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={s.color}
                        strokeWidth={s.key === "energy" ? 2 : 1.5}
                        strokeDasharray={s.dash}
                        dot={{ r: 2, strokeWidth: 0, fill: s.color }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="hs-legend">
                {SERIES.map((s) => (
                  <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <i
                      aria-hidden="true"
                      style={{
                        width: "1.1rem",
                        height: 0,
                        borderTop: `${s.key === "energy" ? 2 : 1.5}px ${s.dash ? "dashed" : "solid"} ${s.color}`,
                      }}
                    />
                    {s.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">No readings in the last 45 days.</p>
          )}
        </section>

        <aside className="hs-card hs-stack" style={{ gap: "0.6rem" }}>
          <span className="cap">Weekly recap</span>
          {digest ? (
            <div className="hs-stack" style={{ gap: "0.6rem" }}>
              <h3 style={{ fontSize: "var(--fs-h3)", letterSpacing: "-0.02em" }}>
                {digest.episodeTitle}
              </h3>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "var(--fs-sm)" }}>
                {digest.recap}
              </p>
              <div className="note note--info">
                <span className="cap" style={{ display: "block", marginBottom: "0.25rem" }}>
                  Takeaway
                </span>
                {digest.insight}
              </div>
              <span className="cap">
                {digest.entryCount} entries ·{" "}
                {new Date(digest.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
          ) : (
            <p className="empty" style={{ fontSize: "var(--fs-sm)" }}>
              Once you have a couple of entries this week, Gemini writes a short recap with
              one plain observation at the end.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
