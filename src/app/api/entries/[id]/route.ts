import { requireUid } from "@/lib/auth";
import { handleError, fail, ok } from "@/lib/api";
import { getEntry } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await requireUid(req);
    const { id } = await params;
    const entry = await getEntry(uid, id);
    if (!entry) return fail("Entry not found", 404);
    return ok({ entry });
  } catch (err) {
    return handleError(err);
  }
}
