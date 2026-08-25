import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  deleteCommunityMessage,
  listCommunity,
  ServiceError,
} from "@/lib/db/service";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    let forEveryone = false;
    try {
      const body = await parseJsonBody<{ forEveryone?: boolean }>(req);
      forEveryone = body.forEveryone ?? false;
    } catch {}

    await deleteCommunityMessage(session, id, forEveryone);
    const { community } = await listCommunity({ limit: 100, userId: session.id });

    return jsonOk({ community });
  } catch (err) {
    return handleServiceError(err);
  }
}
