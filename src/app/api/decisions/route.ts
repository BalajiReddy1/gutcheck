import { requireUid } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { readJsonBody } from "@/lib/sanitize";
import { createDecisionSchema } from "@/lib/schemas";
import { calibration, createDecision, listDecisions } from "@/lib/db";
import { generateContentWithFallback, parseJsonObject } from "@/lib/gemini";
import { RED_TEAM_SYSTEM, redTeamContents } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    const decisions = await listDecisions(uid);
    return ok({ decisions, calibration: calibration(decisions) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = await readJsonBody(req);
    const input = createDecisionSchema.parse(body);

    let redTeam: string[] = [];
    try {
      const raw = await generateContentWithFallback(redTeamContents(input), {
        system: RED_TEAM_SYSTEM,
        json: true,
        temperature: 0.6,
      });
      const parsed = parseJsonObject<{ points?: unknown }>(raw);
      if (Array.isArray(parsed.points)) {
        redTeam = parsed.points.filter((p): p is string => typeof p === "string").slice(0, 6);
      }
    } catch {
      /* red-team is additive; a decision still saves without it */
    }

    const decision = await createDecision(uid, {
      entryId: input.entryId ?? null,
      statement: input.statement,
      rationale: input.rationale,
      prediction: input.prediction,
      confidence: input.confidence,
      redTeam,
      reviewDueAt: Date.now() + input.reviewInDays * 86400_000,
    });

    return ok({ decision });
  } catch (err) {
    return handleError(err);
  }
}
