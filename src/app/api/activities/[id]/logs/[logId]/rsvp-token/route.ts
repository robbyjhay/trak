import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { ensureRsvpToken } from "@/lib/db/service";

/**
 * Generate (or regenerate) a cryptographic RSVP token for a daily log.
 * Returns the raw token once; only the hash is stored.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { logId } = await ctx.params;
    const { log, token } = await ensureRsvpToken(session, logId);
    return jsonOk({ log, token });
  } catch (err) {
    return handleServiceError(err);
  }
}
