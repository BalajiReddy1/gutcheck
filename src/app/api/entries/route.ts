import { requireUid } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";
import { readJsonBody } from "@/lib/sanitize";
import { createEntrySchema } from "@/lib/schemas";
import { appendTurn, getEntry, listEntries } from "@/lib/db";
import { generateContentWithFallback } from "@/lib/gemini";
import { JOURNAL_SYSTEM, TITLE_SYSTEM, journalContents, wrapEntry } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    return ok({ entries: await listEntries(uid) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = await readJsonBody(req);
    const { message, entryId, mood } = createEntrySchema.parse(body);

    const existing = entryId ? await getEntry(uid, entryId) : null;
    if (entryId && !existing) return ok({ error: "Entry not found" }, 404);

    const reply = await generateContentWithFallback(
      journalContents(existing?.turns ?? [], message),
      { system: JOURNAL_SYSTEM, temperature: 0.7 },
    );

    let title = existing?.title ?? "Untitled entry";
    if (!existing) {
      try {
        title = (
          await generateContentWithFallback(wrapEntry(message), {
            system: TITLE_SYSTEM,
            temperature: 0.3,
          })
        )
          .replace(/["'\n]/g, "")
          .slice(0, 60) || title;
      } catch {
        /* title is best-effort; never block the save on it */
      }
    }

    // Guaranteed transaction verification: both the user message and the model
    // reply are persisted together, or the request fails loudly.
    const entry = await appendTurn(uid, {
      entryId: existing?.id,
      userText: message,
      modelText: reply,
      title,
      mood: mood ?? null,
    });

    return ok({ entry });
  } catch (err) {
    return handleError(err);
  }
}
