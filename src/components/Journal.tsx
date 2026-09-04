"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MoodSliders from "@/components/MoodSliders";
import type { Entry, MoodSample } from "@/lib/types";

const STARTERS = [
  "I keep putting off…",
  "I am unsure whether to…",
  "This week I was surprised by…",
  "I was certain about…",
];

export default function Journal() {
  const { apiFetch } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState<Entry | null>(null);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<MoodSample | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/entries");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your entries.");
      setEntries(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your entries.");
    } finally {
      setLoaded(true);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    threadRef.current?.scrollTo(0, threadRef.current.scrollHeight);
  }, [active?.turns.length]);

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/entries", {
        method: "POST",
        body: JSON.stringify({ message: text, entryId: active?.id, mood: mood ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That did not save. Nothing was lost.");
      setActive(data.entry);
      setEntries((prev) => [data.entry, ...prev.filter((e) => e.id !== data.entry.id)]);
      setMessage("");
      setMood(null);
    } catch (e) {
      // input buffer is kept on purpose so a retry does not lose what you wrote
      setError(e instanceof Error ? e.message : "That did not save. Nothing was lost.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="view">
      <div className="view-head">
        <h1>{active ? active.title : "New entry"}</h1>
        {active && (
          <button className="btn-hs btn-hs--sm" onClick={() => setActive(null)}>
            New entry
          </button>
        )}
      </div>

      <div className="cols cols--writer">
        <section className="hs-card card--pad-lg hs-stack" style={{ gap: "1.1rem", minHeight: "28rem" }}>
          <div
            ref={threadRef}
            className="log"
            style={{ flex: 1, overflowY: "auto", maxHeight: "26rem", paddingRight: "0.3rem" }}
          >
            {!active && (
              <div className="blank">
                <p className="blank-lead">What is on your mind?</p>
                <p className="empty">
                  Gemini reads your entry back, looks for the pattern, and asks one question.
                  Saved to your account only.
                </p>
                <div className="starters">
                  <span className="cap">Or start with one of these</span>
                  {STARTERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setMessage(`${t} `);
                        composerRef.current?.focus();
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {active?.turns.map((t, i) => (
              <p key={i} className={`line ${t.role === "user" ? "line--you" : "line--ai"}`}>
                {t.text}
              </p>
            ))}
            {sending && (
              <p className="line line--ai muted">
                <span className="spinner" /> reading it back
              </p>
            )}
          </div>

          {error && (
            <div className="note note--warn between">
              <span>{error}</span>
              <button className="btn-hs btn-hs--sm" onClick={send}>
                Retry
              </button>
            </div>
          )}

          {!active && <MoodSliders value={mood} onChange={setMood} />}

          <div className="composer">
            <textarea
              ref={composerRef}
              className="hs-input"
              rows={3}
              placeholder="Type your reflection"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            <button className="btn-hs btn-hs--lime" onClick={send} disabled={sending}>
              {sending ? "…" : "Send"}
            </button>
          </div>
          <span className="cap">Cmd / Ctrl + Enter</span>
        </section>

        <aside className="hs-card hs-stack" style={{ gap: "0.5rem" }}>
          <span className="cap">Register</span>
          {!loaded && <div className="bar" style={{ marginTop: "0.5rem" }} />}
          {loaded && entries.length === 0 && (
            <p className="empty">Entries you save appear here, newest first.</p>
          )}
          <div className="reg">
            {entries.map((e) => (
              <button key={e.id} aria-current={active?.id === e.id} onClick={() => setActive(e)}>
                <div className="r-t">{e.title}</div>
                <div className="r-m">
                  {new Date(e.createdAt).toISOString().slice(0, 10)} · {e.turns.length} turns
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
