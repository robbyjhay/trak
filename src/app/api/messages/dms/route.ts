import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { tryIdempotent } from "@/lib/idempotency";
import {
  listDmsForUser,
  myNotifications,
  sendDm,
  ServiceError,
} from "@/lib/db/service";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { processLinkPreviewAsync } from "@/lib/link-preview-service";

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
  // --- idempotency check (Phase 3B) ---
  const { cached, storeResult } = await tryIdempotent(req);
  if (cached) return cached;
  // -----------------------------------

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

    if (body.text) {
      void processLinkPreviewAsync(result.id, "dm", body.text, session.id);
    }

    const responseBody = {
      id: result.id,
      dms,
      notifications,
    };
    storeResult(responseBody);
    return jsonOk(responseBody);
  } catch (err) {
    // Failure: do NOT persist the key, so the client can retry safely.
    return handleServiceError(err);
  }
}
