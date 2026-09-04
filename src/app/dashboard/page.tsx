"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Gauge from "@/components/Gauge";
import Journal from "@/components/Journal";
import Decisions from "@/components/Decisions";
import Insights from "@/components/Insights";
import SearchPanel from "@/components/SearchPanel";
import type { CalibrationSummary } from "@/lib/types";

type Tab = "journal" | "decisions" | "insights" | "search";

const TABS: { id: Tab; label: string }[] = [
  { id: "journal", label: "Journal" },
  { id: "decisions", label: "Decisions" },
  { id: "insights", label: "Trends" },
  { id: "search", label: "Search" },
];

export default function Dashboard() {
  const { user, loading, signOut, apiFetch } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("journal");
  const [cal, setCal] = useState<CalibrationSummary | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const loadCal = useCallback(async () => {
    try {
      const res = await apiFetch("/api/decisions");
      const data = await res.json();
      if (res.ok) setCal(data.calibration);
    } catch {
      /* the rail gauge is not load-bearing; ignore */
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user) loadCal();
  }, [user, loadCal]);

  if (loading || !user) {
    return (
      <div className="edge" style={{ paddingTop: "5rem" }}>
        <span className="spinner" /> <span className="cap">Loading</span>
      </div>
    );
  }

  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="app">
      <aside className="rail">
        <span className="rail-mark">
          Gutcheck
        </span>

        {/* The lime marker travels to the active section rather than each item
            lighting up independently, so the rail reads as one moving part. */}
        <nav
          className="rail-nav"
          aria-label="Sections"
          style={{ "--i": index } as React.CSSProperties}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="rail-foot">
          {cal && cal.tendency !== "not enough data" ? (
            <Gauge
              bias={cal.bias}
              brier={cal.brier}
              count={cal.resolvedCount}
              compact
              tone="ink"
            />
          ) : (
            <p className="cap" style={{ lineHeight: 1.7 }}>
              Resolve three calls
              <br />
              to read the needle
            </p>
          )}
          <div className="rail-user">
            <span>{user.displayName ?? user.email}</span>
            <button className="btn-hs btn-hs--ghost btn-hs--sm" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="work">
        {tab === "journal" && <Journal />}
        {tab === "decisions" && <Decisions onCal={setCal} />}
        {tab === "insights" && <Insights />}
        {tab === "search" && <SearchPanel />}
      </main>
    </div>
  );
}
