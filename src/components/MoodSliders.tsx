"use client";

import type { MoodSample } from "@/lib/types";

const FIELDS: { key: keyof MoodSample; label: string; lo: string; hi: string }[] = [
  { key: "energy", label: "Energy", lo: "drained", hi: "wired" },
  { key: "mood", label: "Mood", lo: "low", hi: "good" },
  { key: "overwhelm", label: "Overwhelm", lo: "calm", hi: "underwater" },
];

const DEFAULT: MoodSample = { energy: 3, mood: 3, overwhelm: 3 };

export default function MoodSliders({
  value,
  onChange,
}: {
  value: MoodSample | null;
  onChange: (m: MoodSample | null) => void;
}) {
  const v = value ?? DEFAULT;
  return (
    <div
      className="hs-stack"
      style={{
        gap: "0.75rem",
        paddingBlock: "1.1rem",
        borderTop: "1px solid var(--rule-firm)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div className="between">
        <span className="cap">Readings (optional)</span>
        {value && (
          <button className="btn-hs btn-hs--ghost btn-hs--sm" onClick={() => onChange(null)}>
            clear
          </button>
        )}
      </div>
      {FIELDS.map((f) => (
        <label key={f.key} className="hs-stack" style={{ gap: "0.4rem" }}>
          <span className="ctl-label">
            <span>{f.label}</span>
            <span className="cap" style={{ letterSpacing: "0.04em" }}>
              {f.lo} · {f.hi} · <span className="num">{v[f.key]}</span>
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={v[f.key]}
            onChange={(e) => onChange({ ...v, [f.key]: Number(e.target.value) })}
          />
        </label>
      ))}
    </div>
  );
}
