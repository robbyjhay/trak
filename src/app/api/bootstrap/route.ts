import { getSnapshot } from "@/lib/db/store";
import { recomputeAllStatuses } from "@/lib/db/service";
import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { RESPONSIBILITIES } from "@/lib/mockDb/responsibilities";

/** Full client bootstrap: users + db + static responsibilities. */
export async function GET() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    // Keep activity statuses current relative to "today"
    await recomputeAllStatuses();
    const snap = await getSnapshot();

    return jsonOk({
      session,
      users: snap.users,
      db: snap.db,
      responsibilities: RESPONSIBILITIES,
      serverTime: snap.serverTime,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
