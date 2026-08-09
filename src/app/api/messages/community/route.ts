import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { sendCommunity, wipeCommunity } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const snap = await getSnapshot();
    return jsonOk({ community: snap.db.community });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<{ text?: string }>(req);
    const result = await sendCommunity(session, body.text || "");
    const snap = await getSnapshot();
    return jsonOk({ id: result.id, community: snap.db.community });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function DELETE() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    await wipeCommunity(session);
    return jsonOk({ community: [] });
  } catch (err) {
    return handleServiceError(err);
  }
}
