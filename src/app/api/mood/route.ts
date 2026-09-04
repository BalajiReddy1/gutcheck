import { requireUid } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { recentMoodSeries } from "@/lib/db";
import { generateContentWithFallback } from "@/lib/gemini";
import { wrapEntry } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BURNOUT_SYSTEM =
  "You analyse a short time series of self-reported energy/mood/overwhelm scores " +
  "(1-5). In one or two plain sentences, say whether there is a concerning downward " +
  "trend or sustained high overwhelm worth flagging, or reassure if things look " +
  "stable. No therapy-speak. If fewer than 4 points, say there is not enough data yet.";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
    const series = await recentMoodSeries(uid, days);

    let signal = "Not enough data yet - log mood with a few more entries.";
    if (series.length >= 4) {
      try {
        signal = await generateContentWithFallback(
          wrapEntry(
            series
              .map((r) => `${r.date}: energy ${r.energy}, mood ${r.mood}, overwhelm ${r.overwhelm}`)
              .join("\n"),
          ),
          { system: BURNOUT_SYSTEM, temperature: 0.4 },
        );
      } catch {
        signal = "Trend analysis is unavailable right now.";
      }
    }

    return ok({ series, signal });
  } catch (err) {
    return handleError(err);
  }
}
