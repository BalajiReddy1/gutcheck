import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase.admin";
import { stripUndefined } from "./sanitize";
import type {
  CalibrationSummary,
  ChatTurn,
  Decision,
  Digest,
  Entry,
  MoodSample,
} from "./types";

const userDoc = (uid: string) => adminDb().collection("users").doc(uid);
const entriesCol = (uid: string) => userDoc(uid).collection("interactions");
const decisionsCol = (uid: string) => userDoc(uid).collection("decisions");
const digestsCol = (uid: string) => userDoc(uid).collection("digests");

async function touchUser(uid: string) {
  await userDoc(uid).set(
    stripUndefined({ uid, lastActiveAt: Date.now() }),
    { merge: true },
  );
}

// ---------- Entries ----------

export async function listEntries(uid: string, limit = 50): Promise<Entry[]> {
  const snap = await entriesCol(uid).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Entry, "id">) }));
}

export async function getEntry(uid: string, id: string): Promise<Entry | null> {
  const d = await entriesCol(uid).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Entry, "id">) };
}

export async function appendTurn(
  uid: string,
  opts: { entryId?: string; userText: string; modelText: string; title: string; mood?: MoodSample | null },
): Promise<Entry> {
  await touchUser(uid);
  const now = Date.now();
  const userTurn: ChatTurn = { role: "user", text: opts.userText, at: now };
  const modelTurn: ChatTurn = { role: "model", text: opts.modelText, at: now + 1 };

  if (opts.entryId) {
    const ref = entriesCol(uid).doc(opts.entryId);
    await ref.set(
      stripUndefined({
        turns: FieldValue.arrayUnion(userTurn, modelTurn),
        updatedAt: now,
        ...(opts.mood ? { mood: opts.mood } : {}),
      }),
      { merge: true },
    );
    const updated = await getEntry(uid, opts.entryId);
    if (!updated) throw new Error("Entry vanished after write");
    return updated;
  }

  const ref = entriesCol(uid).doc();
  const entry: Omit<Entry, "id"> = {
    title: opts.title,
    turns: [userTurn, modelTurn],
    mood: opts.mood ?? null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(stripUndefined(entry));
  return { id: ref.id, ...entry };
}

export async function recentMoodSeries(
  uid: string,
  days: number,
): Promise<{ date: string; mood: number; energy: number; overwhelm: number }[]> {
  const since = Date.now() - days * 86400_000;
  const snap = await entriesCol(uid).orderBy("createdAt", "desc").limit(200).get();
  const rows = snap.docs
    .map((d) => d.data() as Entry)
    .filter((e) => e.createdAt >= since && e.mood)
    .map((e) => ({
      date: new Date(e.createdAt).toISOString().slice(0, 10),
      mood: e.mood!.mood,
      energy: e.mood!.energy,
      overwhelm: e.mood!.overwhelm,
    }))
    .reverse();
  return rows;
}

// ---------- Decisions ----------

export async function listDecisions(uid: string): Promise<Decision[]> {
  const snap = await decisionsCol(uid).orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Decision, "id">) }));
}

export async function createDecision(
  uid: string,
  data: Omit<Decision, "id" | "createdAt" | "status">,
): Promise<Decision> {
  await touchUser(uid);
  const ref = decisionsCol(uid).doc();
  const doc: Omit<Decision, "id"> = {
    ...data,
    status: "open",
    createdAt: Date.now(),
  };
  await ref.set(stripUndefined(doc));
  return { id: ref.id, ...doc };
}

export async function resolveDecision(
  uid: string,
  id: string,
  patch: { outcome: string; outcomeScore: number },
): Promise<Decision> {
  const ref = decisionsCol(uid).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Decision not found");
  await ref.set(
    stripUndefined({
      status: "resolved",
      outcome: patch.outcome,
      outcomeScore: patch.outcomeScore,
      resolvedAt: Date.now(),
    }),
    { merge: true },
  );
  const updated = await ref.get();
  return { id: updated.id, ...(updated.data() as Omit<Decision, "id">) };
}

export function calibration(decisions: Decision[]): CalibrationSummary {
  const resolved = decisions.filter(
    (d) => d.status === "resolved" && typeof d.outcomeScore === "number",
  );
  if (resolved.length < 3) {
    return {
      resolvedCount: resolved.length,
      brier: null,
      bias: 0,
      tendency: "not enough data",
    };
  }
  // outcomeScore: 1 = happened as predicted, 0 = opposite. Confidence is P(as predicted).
  let se = 0;
  let signedGap = 0;
  for (const d of resolved) {
    const p = d.confidence / 100;
    const o = d.outcomeScore as number;
    se += (p - o) ** 2;
    signedGap += p - o; // positive => predicted more certainty than reality => overconfident
  }
  const brier = se / resolved.length;
  const avgGap = signedGap / resolved.length;
  const tendency =
    Math.abs(avgGap) < 0.08
      ? "well-calibrated"
      : avgGap > 0
        ? "overconfident"
        : "underconfident";
  return { resolvedCount: resolved.length, brier, bias: avgGap, tendency };
}

// ---------- Digests ----------

export async function latestDigest(uid: string): Promise<Digest | null> {
  const snap = await digestsCol(uid).orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Digest, "id">) };
}

export async function saveDigest(
  uid: string,
  data: Omit<Digest, "id" | "createdAt">,
): Promise<Digest> {
  const ref = digestsCol(uid).doc();
  const doc: Omit<Digest, "id"> = { ...data, createdAt: Date.now() };
  await ref.set(stripUndefined(doc));
  return { id: ref.id, ...doc };
}
