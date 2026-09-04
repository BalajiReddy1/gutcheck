"use client";

/**
 * LOCAL PREVIEW ONLY. Renders the dashboard with canned data and a fake user so
 * the screens can be viewed without a live Firebase project. Not linked from the
 * app; excluded from production by the guard below.
 */

import { useMemo, useState } from "react";
import { Ctx, type AuthCtx } from "@/components/AuthProvider";
import Gauge from "@/components/Gauge";
import Journal from "@/components/Journal";
import Decisions from "@/components/Decisions";
import Insights from "@/components/Insights";
import SearchPanel from "@/components/SearchPanel";

const now = Date.now();
const day = 86400_000;

const ENTRIES = [
  {
    id: "e1",
    title: "Shipping cadence",
    turns: [
      {
        role: "user",
        text: "Third week in a row I planned five days of deep work and got maybe two. I keep blaming meetings but honestly I think I'm just tired.",
        at: now - 2 * day,
      },
      {
        role: "model",
        text: "You have named the meetings three weeks running and then corrected yourself each time. The pattern is not your calendar, it is that you are starting the week already behind on rest. What did the two good days have in common?",
        at: now - 2 * day + 1,
      },
    ],
    mood: { energy: 2, mood: 3, overwhelm: 4 },
    tags: [],
    createdAt: now - 2 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: "e2",
    title: "Piano, week two",
    turns: [
      {
        role: "user",
        text: "Kept the 6am practice going. Fifteen minutes most days. It is less about the piano and more that I like starting the day having already done one honest thing.",
        at: now - 6 * day,
      },
      {
        role: "model",
        text: "That is a strong reason to protect it. The risk is tying it to a time of day that the first busy week will take back. Would it survive being moved rather than skipped?",
        at: now - 6 * day + 1,
      },
    ],
    mood: { energy: 3, mood: 4, overwhelm: 2 },
    tags: [],
    createdAt: now - 6 * day,
    updatedAt: now - 6 * day,
  },
  {
    id: "e3",
    title: "The channel decision",
    turns: [
      {
        role: "user",
        text: "Thinking about going all in on the YouTube channel for three months. Cutting the freelance work back to fund it.",
        at: now - 9 * day,
      },
      {
        role: "model",
        text: "This is the kind of thing worth logging as a decision so you can check it honestly later. What does a good outcome look like by the end of month three, in a number you cannot argue with?",
        at: now - 9 * day + 1,
      },
    ],
    mood: { energy: 4, mood: 4, overwhelm: 3 },
    tags: [],
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
  },
];

const DECISIONS = [
  {
    id: "d1",
    entryId: "e3",
    statement: "Go all in on the YouTube channel for three months",
    rationale:
      "Freelance pays the bills but it is capped. The channel has upside and I have been half-committing for a year. Three months of real effort tells me if it is worth it.",
    prediction: "Hit 2,000 subscribers and one brand enquiry by the end of month three",
    confidence: 75,
    redTeam: [
      "You are comparing three months of full effort against a year of half effort, which is not the same experiment and may flatter the result.",
      "Cutting freelance income adds financial pressure that tends to push creators toward safer, less distinctive videos.",
      "Subscriber count is a vanity target; one brand enquiry depends on factors outside your control in that window.",
      "There is no stated line for what result would make you stop, so a mediocre outcome will read as 'keep going'.",
    ],
    status: "open",
    reviewDueAt: now + 40 * day,
    createdAt: now - 9 * day,
  },
  {
    id: "d2",
    entryId: null,
    statement: "Move piano practice to 6am so it survives busy weeks",
    rationale:
      "Evenings never happen. Mornings are the only time nothing else competes for the slot.",
    prediction: "Practise at least five days a week for a month straight",
    confidence: 80,
    redTeam: [
      "Morning routines are the first thing a bad night of sleep removes.",
      "Tying the habit to a fixed hour makes a missed slot feel like a broken streak, which is when people quit.",
      "You have not said what happens on travel days.",
    ],
    status: "resolved",
    reviewDueAt: now - 5 * day,
    createdAt: now - 40 * day,
    outcome:
      "Held for nine days, then a deadline week broke the streak and it took two weeks to restart. Now doing it most days but not tied to a time.",
    outcomeScore: 0.35,
    resolvedAt: now - 4 * day,
  },
  {
    id: "d3",
    entryId: null,
    statement: "Say no to the contract extension and keep the quarter open",
    rationale:
      "The money is good but it is the same work and it would fill the exact hours I wanted for my own projects.",
    prediction: "Use the freed time on the channel and not just absorb it into other client work",
    confidence: 60,
    redTeam: [
      "Freed time reliably gets absorbed by whatever is most urgent, which is usually client work.",
      "Turning down a known client has a relationship cost that is easy to underweight now.",
    ],
    status: "resolved",
    reviewDueAt: now - 20 * day,
    createdAt: now - 60 * day,
    outcome:
      "Turned it down. About half the time went to the channel, the rest leaked into a different client. Better than expected but not the clean result I pictured.",
    outcomeScore: 0.55,
    resolvedAt: now - 18 * day,
  },
  {
    id: "d4",
    entryId: null,
    statement: "Batch-record four videos in one weekend instead of one per week",
    rationale: "Context switching every week is killing momentum. Batching should protect the weekdays.",
    prediction: "Publish weekly for a month with zero weekday recording",
    confidence: 70,
    redTeam: [
      "One low-energy weekend takes out the whole month's buffer at once.",
      "Batch-recorded videos can feel same-y because they are all made in one mood.",
    ],
    status: "resolved",
    reviewDueAt: now - 8 * day,
    createdAt: now - 30 * day,
    outcome: "Recorded three of four. Published weekly anyway by keeping one short. Weekdays did stay clear.",
    outcomeScore: 0.7,
    resolvedAt: now - 6 * day,
  },
];

const CALIBRATION = {
  resolvedCount: 3,
  brier: 0.19,
  bias: 0.14,
  tendency: "overconfident" as const,
};

const MOOD_POINTS = [
  { energy: 4, mood: 4, overwhelm: 2 },
  { energy: 4, mood: 3, overwhelm: 2 },
  { energy: 3, mood: 3, overwhelm: 3 },
  { energy: 3, mood: 3, overwhelm: 3 },
  { energy: 2, mood: 2, overwhelm: 4 },
  { energy: 2, mood: 2, overwhelm: 4 },
  { energy: 2, mood: 3, overwhelm: 5 },
  { energy: 3, mood: 3, overwhelm: 4 },
  { energy: 3, mood: 4, overwhelm: 3 },
  { energy: 4, mood: 4, overwhelm: 3 },
  { energy: 4, mood: 4, overwhelm: 2 },
];
const MOOD_SERIES = MOOD_POINTS.map((p, i) => ({
  date: new Date(now - (MOOD_POINTS.length - 1 - i) * 4 * day).toISOString().slice(5, 10),
  ...p,
}));

const DIGEST = {
  id: "g1",
  periodStart: now - 7 * day,
  periodEnd: now,
  episodeTitle: "Episode 11: In Which Our Hero Negotiates With a 6am Alarm and Mostly Wins",
  recap:
    "This week opened on a familiar note: five days of deep work planned, two delivered, and a brief but heartfelt monologue blaming the calendar before admitting it was the sleep. The piano subplot continued quietly in the background, fifteen minutes at a time, less a musical arc than a small daily proof of seriousness. Late in the week the channel decision finally got written down with a real number attached to it, which the narrator noted with the tone of someone who has been circling a diving board for a year. No dramatic reversals. A lot of quiet maintenance.",
  insight:
    "Your best work days this month all followed nights you actually protected. The deep-work plan is not the problem; the input to it is.",
  entryCount: 3,
  createdAt: now - 1 * day,
};

function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fakeUser = { displayName: "Balaji", email: "you@example.com" } as never;

type Tab = "journal" | "decisions" | "insights" | "search";

export default function Preview() {
  if (process.env.NODE_ENV === "production") {
    return <div style={{ padding: 40 }}>Preview is disabled in production.</div>;
  }

  return <PreviewInner />;
}

function PreviewInner() {
  const [tab, setTab] = useState<Tab>("journal");

  const value = useMemo<AuthCtx>(
    () => ({
      user: fakeUser,
      loading: false,
      signIn: async () => {},
      signOut: async () => {},
      apiFetch: async (path, init = {}) => {
        const method = (init.method || "GET").toUpperCase();
        if (path.startsWith("/api/entries") && method === "GET")
          return mockResponse({ entries: ENTRIES });
        if (path.startsWith("/api/entries") && method === "POST") {
          const draft = ENTRIES[0];
          return mockResponse({ entry: draft });
        }
        if (path.startsWith("/api/decisions") && method === "GET")
          return mockResponse({ decisions: DECISIONS, calibration: CALIBRATION });
        if (path.startsWith("/api/decisions"))
          return mockResponse({ decisions: DECISIONS, calibration: CALIBRATION });
        if (path.startsWith("/api/mood"))
          return mockResponse({
            series: MOOD_SERIES,
            signal:
              "Energy and mood dipped through the middle of the month and overwhelm rose with them. The last two data points are climbing back. Worth watching, not alarming.",
          });
        if (path.startsWith("/api/digest") && method === "GET")
          return mockResponse({ digest: DIGEST });
        if (path.startsWith("/api/digest"))
          return mockResponse({ digest: DIGEST });
        if (path.startsWith("/api/search"))
          return mockResponse({ results: [ENTRIES[0], ENTRIES[2]] });
        return mockResponse({ error: "not mocked" }, 404);
      },
    }),
    [],
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: "journal", label: "Journal" },
    { id: "decisions", label: "Decisions" },
    { id: "insights", label: "Trends" },
    { id: "search", label: "Search" },
  ];

  return (
    <Ctx.Provider value={value}>
      <div className="app">
        <aside className="rail">
          <span className="rail-mark">
            Gutcheck
            </span>
          <nav
            className="rail-nav"
            aria-label="Sections"
            style={{ "--i": TABS.findIndex((t) => t.id === tab) } as React.CSSProperties}
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
            <Gauge
              bias={CALIBRATION.bias}
              brier={CALIBRATION.brier}
              count={CALIBRATION.resolvedCount}
              compact
              tone="ink"
            />
            <div className="rail-user">
              <span>Balaji</span>
              <button className="btn-hs btn-hs--ghost btn-hs--sm">Sign out</button>
            </div>
          </div>
        </aside>
        <main className="work">
          {tab === "journal" && <Journal />}
          {tab === "decisions" && <Decisions />}
          {tab === "insights" && <Insights />}
          {tab === "search" && <SearchPanel />}
        </main>
      </div>
    </Ctx.Provider>
  );
}
