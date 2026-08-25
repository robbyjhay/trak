import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  deleteDmMessage,
  listDmsForUser,
  myNotifications,
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

    await deleteDmMessage(session, id, forEveryone);
    const { dms } = await listDmsForUser(session, { limit: 200 });
    const notifications = await myNotifications(session);

    return jsonOk({ dms, notifications });
  } catch (err) {
    return handleServiceError(err);
  }
}
