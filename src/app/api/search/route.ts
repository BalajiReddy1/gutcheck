import { requireUid } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { readJsonBody } from "@/lib/sanitize";
import { searchSchema } from "@/lib/schemas";
import { listEntries } from "@/lib/db";
import { generateContentWithFallback, parseJsonObject } from "@/lib/gemini";
import { SEARCH_SYSTEM, searchContents } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = await readJsonBody(req);
    const { query } = searchSchema.parse(body);

    const entries = await listEntries(uid, 100);
    if (entries.length === 0) return ok({ results: [] });

    // Cheap keyword prefilter, then let the model rank semantically.
    const q = query.toLowerCase();
    const prefiltered = entries
      .map((e) => {
        const hay = (e.title + " " + e.turns.map((t) => t.text).join(" ")).toLowerCase();
        const score = q
          .split(/\s+/)
          .reduce((s, w) => (w.length > 2 && hay.includes(w) ? s + 1 : s), 0);
        return { e, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.e);

    const pool = prefiltered.length >= 5 ? prefiltered : entries.slice(0, 30);

    let ids: string[] = [];
    try {
      const raw = await generateContentWithFallback(searchContents(query, pool), {
        system: SEARCH_SYSTEM,
        json: true,
        temperature: 0.1,
      });
      const parsed = parseJsonObject<{ ids?: unknown }>(raw);
      if (Array.isArray(parsed.ids)) {
        ids = parsed.ids.filter((i): i is string => typeof i === "string");
      }
    } catch {
      ids = pool.slice(0, 6).map((e) => e.id);
    }

    const byId = new Map(entries.map((e) => [e.id, e]));
    const results = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 6);
    return ok({ results });
  } catch (err) {
    return handleError(err);
  }
}
