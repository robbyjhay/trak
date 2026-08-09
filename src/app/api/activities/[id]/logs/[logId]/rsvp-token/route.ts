import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { setLogRsvpToken, ServiceError } from "@/lib/db/service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { logId } = await ctx.params;
    const body = await parseJsonBody<{ token?: string }>(req);
    if (!body.token) {
      throw new ServiceError(400, "token is required");
    }
    const log = await setLogRsvpToken(session, logId, body.token);
    return jsonOk({ log });
  } catch (err) {
    return handleServiceError(err);
  }
}
