import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { tryIdempotent } from "@/lib/idempotency";
import {
  listCommunity,
  sendCommunity,
  ServiceError,
  wipeCommunity,
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
    const { community, total } = await listCommunity({ page, limit, userId: session.id });

    return jsonOk({ community, meta: pageMeta(total, page, limit) });
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

    const rl = await checkRateLimit(`msg:community:${session.id}`, 60, 60);
    if (!rl.allowed) {
      throw new ServiceError(429, "Message rate limit exceeded.");
    }

    const body = await parseJsonBody<{ text?: string; replyToId?: string; attachments?: any[]; mentions?: { userId: string; position: number }[] }>(
      req,
    );
    const result = await sendCommunity(session, body.text || "", body.replyToId, body.attachments, body.mentions);
    const { community } = await listCommunity({ limit: 100, userId: session.id });

    if (body.text) {
      void processLinkPreviewAsync(result.id, "community", body.text, session.id);
    }

    const responseBody = { community };
    storeResult(responseBody);
    return jsonOk(responseBody);
  } catch (err) {
    // Failure: do NOT persist the key, so the client can retry safely.
    return handleServiceError(err);
  }
}

export async function DELETE() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    await wipeCommunity(session);
    return jsonOk({ community: [] as any[] });
  } catch (err) {
    return handleServiceError(err);
  }
}
