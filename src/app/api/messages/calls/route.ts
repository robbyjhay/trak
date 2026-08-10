import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  listCallsForUser,
  recordCall,
  ServiceError,
} from "@/lib/db/service";

export async function GET() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const calls = await listCallsForUser(session);
    return jsonOk({ calls });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<{ toId?: string; durationSec?: number }>(
      req,
    );
    if (!body.toId) {
      throw new ServiceError(400, "toId is required");
    }
    await recordCall(session, body.toId, body.durationSec || 0);
    const calls = await listCallsForUser(session);
    return jsonOk({ calls });
  } catch (err) {
    return handleServiceError(err);
  }
}
