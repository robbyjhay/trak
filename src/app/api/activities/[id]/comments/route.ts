import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { addComment } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const snap = await getSnapshot();
    return jsonOk({
      comments: snap.db.comments.filter((c) => c.activityId === id),
    });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const body = await parseJsonBody<{ text?: string }>(req);
    const comment = await addComment(session, id, body.text || "");
    const snap = await getSnapshot();
    return jsonOk({
      comment,
      notifications: snap.db.notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
