import {
  handleServiceError,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { respondToCollaborationInvite } from "@/lib/db/service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;

    const body = await parseJsonBody<{ action?: "accept" | "decline" }>(req);
    if (body.action !== "accept" && body.action !== "decline") {
      return jsonError(400, "action must be either 'accept' or 'decline'");
    }

    const result = await respondToCollaborationInvite(session, id, body.action);
    return jsonOk(result);
  } catch (err) {
    return handleServiceError(err);
  }
}