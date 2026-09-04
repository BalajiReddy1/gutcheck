import { requireUid } from "@/lib/auth";
import { handleError, fail, ok } from "@/lib/api";
import { readJsonBody } from "@/lib/sanitize";
import { digestSchema } from "@/lib/schemas";
import { latestDigest, listEntries, saveDigest } from "@/lib/db";
import { generateContentWithFallback, parseJsonObject } from "@/lib/gemini";
import { DIGEST_SYSTEM, digestContents } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    return ok({ digest: await latestDigest(uid) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = await readJsonBody(req);
    const { days } = digestSchema.parse(body);

    const since = Date.now() - days * 86400_000;
    const entries = (await listEntries(uid, 100)).filter((e) => e.createdAt >= since);
    if (entries.length < 2) {
      return fail(`Need at least 2 entries in the last ${days} days to write a recap.`, 400);
    }

    const raw = await generateContentWithFallback(digestContents(entries), {
      system: DIGEST_SYSTEM,
      json: true,
      temperature: 0.9,
    });
    const parsed = parseJsonObject<{
      episodeTitle?: string;
      recap?: string;
      insight?: string;
    }>(raw);

    const digest = await saveDigest(uid, {
      periodStart: since,
      periodEnd: Date.now(),
      episodeTitle: parsed.episodeTitle?.slice(0, 160) || "This Week, Recapped",
      recap: parsed.recap?.slice(0, 2000) || "",
      insight: parsed.insight?.slice(0, 600) || "",
      entryCount: entries.length,
    });

    return ok({ digest });
  } catch (err) {
    return handleError(err);
  }
}
