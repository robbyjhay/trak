import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { tryIdempotent } from "@/lib/idempotency";
import {
  listAnnouncements,
  myNotifications,
  postAnnouncement,
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
    const { announcements, total } = await listAnnouncements(session, {
      page,
      limit,
    });

    return jsonOk({ announcements, meta: pageMeta(total, page, limit) });
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

    const rl = await checkRateLimit(`msg:announcement:${session.id}`, 20, 3600);
    if (!rl.allowed) {
      throw new ServiceError(429, "Announcement rate limit exceeded.");
    }

    const body = await parseJsonBody<{
      text?: string;
      mentions?: { userId: string; position: number }[];
    }>(req);
    const result = await postAnnouncement(
      session,
      body.text || "",
      body.mentions,
    );
    const { announcements } = await listAnnouncements(session, { limit: 50 });
    const notifications = await myNotifications(session);

    const responseBody = {
      id: result.id,
      announcements,
      notifications,
    };
    storeResult(responseBody);
    return jsonOk(responseBody);
  } catch (err) {
    // Failure: do NOT persist the key, so the client can retry safely.
    return handleServiceError(err);
  }
}