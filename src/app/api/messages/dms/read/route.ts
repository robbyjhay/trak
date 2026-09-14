import { handleServiceError, jsonOk, parseJsonBody, requireSession } from "@/lib/api/http";
import { markDmsRead, ServiceError } from "@/lib/db/service";

/**
 * Mark all unread incoming DMs in a single conversation as read (read
 * receipts). `withUserId` identifies the other participant.
 */
export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await parseJsonBody<{ withUserId?: string }>(req);
    if (!body.withUserId) {
      throw new ServiceError(400, "withUserId is required");
    }

    const result = await markDmsRead(session, body.withUserId);
    return jsonOk(result);
  } catch (err) {
    return handleServiceError(err);
  }
}