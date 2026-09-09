import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { reactToAnnouncement, ServiceError } from "@/lib/db/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    const body = await parseJsonBody<{ emoji?: string }>(req);
    if (!body.emoji) {
      throw new ServiceError(400, "emoji is required");
    }

    const announcement = await reactToAnnouncement(session, id, body.emoji);
    return jsonOk({ announcement });
  } catch (err) {
    return handleServiceError(err);
  }
}