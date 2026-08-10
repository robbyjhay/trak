import {
  getPollSnapshot,
  getScopedBootstrap,
  ServiceError,
} from "@/lib/db/service";
import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/**
 * Scoped bootstrap — returns only data the authenticated user may see.
 * Never returns other users' DMs or full-DB dumps.
 *
 * Query: ?mode=poll → lightweight unread + recent notifications only.
 */
export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    const rl = await checkRateLimit(
      `bootstrap:${session.id}`,
      mode === "poll" ? 60 : 20,
      60,
    );
    if (!rl.allowed) {
      throw new ServiceError(429, "Too many requests. Please slow down.");
    }

    if (mode === "poll") {
      const poll = await getPollSnapshot(session);
      return jsonOk(poll);
    }

    const snap = await getScopedBootstrap(session);

    // Shape matches TrakStore expectations (scoped db, not full dump).
    return jsonOk({
      session,
      users: snap.users,
      db: {
        activities: snap.activities,
        dailyLogs: snap.dailyLogs,
        comments: snap.comments,
        dms: snap.dms,
        calls: snap.calls,
        community: snap.community,
        broadcasts: snap.broadcasts,
        notifications: snap.notifications,
      },
      responsibilities: snap.responsibilities,
      serverTime: snap.serverTime,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
