import { requireUid } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { readJsonBody } from "@/lib/sanitize";
import { resolveDecisionSchema } from "@/lib/schemas";
import { calibration, listDecisions, resolveDecision } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await requireUid(req);
    const { id } = await params;
    const body = await readJsonBody(req);
    const { outcome, wentAsPredicted } = resolveDecisionSchema.parse(body);

    await resolveDecision(uid, id, { outcome, outcomeScore: wentAsPredicted });
    const decisions = await listDecisions(uid);
    return ok({ decisions, calibration: calibration(decisions) });
  } catch (err) {
    return handleError(err);
  }
}
