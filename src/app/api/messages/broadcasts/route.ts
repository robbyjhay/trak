import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  listBroadcasts,
  myNotifications,
  sendBroadcast,
  ServiceError,
} from "@/lib/db/service";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function GET(req: Request) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { broadcasts, total } = await listBroadcasts({ page, limit });

    return jsonOk({ broadcasts, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`msg:broadcast:${session.id}`, 20, 3600);
    if (!rl.allowed) {
      throw new ServiceError(429, "Broadcast rate limit exceeded.");
    }

    const body = await parseJsonBody<{ text?: string }>(req);
    const result = await sendBroadcast(session, body.text || "");
    const { broadcasts } = await listBroadcasts({ limit: 50 });
    const notifications = await myNotifications(session);

    return jsonOk({
      id: result.id,
      broadcasts,
      notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
