"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Entry } from "@/lib/types";

export default function SearchPanel() {
  const { apiFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <div className="view-head">
        <h1>Search</h1>
      </div>

      <section className="hs-card card--pad-lg hs-stack" style={{ gap: "0.75rem" }}>
        <p className="empty" style={{ fontSize: "var(--fs-sm)" }}>
          Ask in plain language. For example: when did I last feel stuck on a project.
        </p>
        <div className="composer">
          <input
            className="hs-input"
            type="text"
            value={query}
            placeholder="Search entries by meaning"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <button className="btn-hs btn-hs--lime" onClick={run} disabled={busy}>
            {busy ? "…" : "Search"}
          </button>
        </div>
        {error && <div className="note note--warn">{error}</div>}
      </section>

      {results && results.length === 0 && (
        <p className="empty">Nothing matched. Try different words.</p>
      )}
      {results && results.length > 0 && (
        <div className="cols" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))" }}>
          {results.map((e) => (
            <section key={e.id} className="hs-card hs-stack" style={{ gap: "0.4rem" }}>
              <div className="between">
                <h3 style={{ fontSize: "var(--fs-h3)" }}>{e.title}</h3>
                <span className="cap">{new Date(e.createdAt).toISOString().slice(0, 10)}</span>
              </div>
              <p className="muted" style={{ fontSize: "var(--fs-sm)", lineHeight: 1.55 }}>
                {e.turns.find((t) => t.role === "user")?.text.slice(0, 220)}
              </p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
