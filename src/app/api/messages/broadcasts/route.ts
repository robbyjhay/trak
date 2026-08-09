import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { sendBroadcast } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const snap = await getSnapshot();
    return jsonOk({ broadcasts: snap.db.broadcasts });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<{ text?: string }>(req);
    const result = await sendBroadcast(session, body.text || "");
    const snap = await getSnapshot();
    return jsonOk({
      id: result.id,
      broadcasts: snap.db.broadcasts,
      notifications: snap.db.notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
