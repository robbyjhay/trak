import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  addComment,
  getActivityComments,
  myNotifications,
} from "@/lib/db/service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const comments = await getActivityComments(session, id);
    return jsonOk({ comments });
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
    const notifications = await myNotifications(session);
    return jsonOk({ comment, notifications });
  } catch (err) {
    return handleServiceError(err);
  }
}
