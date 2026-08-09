import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { sendDm, ServiceError } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const snap = await getSnapshot();
    return jsonOk({ dms: snap.db.dms });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<{ toId?: string; text?: string }>(req);
    if (!body.toId) {
      throw new ServiceError(400, "toId is required");
    }
    const result = await sendDm(session, body.toId, body.text || "");
    const snap = await getSnapshot();
    return jsonOk({
      id: result.id,
      dms: snap.db.dms,
      notifications: snap.db.notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
