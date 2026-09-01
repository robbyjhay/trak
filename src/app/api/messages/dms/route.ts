import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  listDmsForUser,
  myNotifications,
  sendDm,
  ServiceError,
} from "@/lib/db/service";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const withUserId = url.searchParams.get("with") || undefined;

    const { dms, total } = await listDmsForUser(session, {
      page,
      limit,
      withUserId,
    });

    return jsonOk({ dms, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`msg:dm:${session.id}`, 60, 60);
    if (!rl.allowed) {
      throw new ServiceError(429, "Message rate limit exceeded.");
    }

    const body = await parseJsonBody<{ toId?: string; text?: string; attachments?: any[]; replyToId?: string | null }>(req);
    if (!body.toId) {
      throw new ServiceError(400, "toId is required");
    }
    const result = await sendDm(session, body.toId, body.text || "", body.attachments, body.replyToId ?? null);
    const { dms } = await listDmsForUser(session, { limit: 200 });
    const notifications = await myNotifications(session);

    return jsonOk({
      id: result.id,
      dms,
      notifications,
    });
  } catch (err) {
    console.error("[POST /api/messages/dms] ERROR:", err);
    return handleServiceError(err);
  }
}
