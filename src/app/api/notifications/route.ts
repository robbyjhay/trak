import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  markAllNotificationsRead,
  markNotificationRead,
  myNotifications,
  ServiceError,
} from "@/lib/db/service";

export async function GET() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const notifications = await myNotifications(session);
    return jsonOk({ notifications });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<{
      id?: string;
      ids?: string[];
      all?: boolean;
    }>(req);

    if (body.all) {
      await markAllNotificationsRead(session);
    } else if (body.ids && Array.isArray(body.ids)) {
      for (const id of body.ids) {
        await markNotificationRead(session, id);
      }
    } else if (body.id) {
      await markNotificationRead(session, body.id);
    } else {
      throw new ServiceError(400, "id, ids, or all is required");
    }

    const notifications = await myNotifications(session);
    return jsonOk({ notifications });
  } catch (err) {
    return handleServiceError(err);
  }
}
