import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  listCommunity,
  sendCommunity,
  ServiceError,
  wipeCommunity,
} from "@/lib/db/service";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function GET(req: Request) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { community, total } = await listCommunity({ page, limit });

    return jsonOk({ community, meta: pageMeta(total, page, limit) });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const rl = await checkRateLimit(`msg:community:${session.id}`, 60, 60);
    if (!rl.allowed) {
      throw new ServiceError(429, "Message rate limit exceeded.");
    }

    const body = await parseJsonBody<{ text?: string; replyToId?: string }>(
      req,
    );
    await sendCommunity(session, body.text || "", body.replyToId);
    const { community } = await listCommunity({ limit: 100 });
    return jsonOk({ community });
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
