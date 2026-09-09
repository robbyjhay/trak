import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { deleteAnnouncement, listAnnouncements } from "@/lib/db/service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    await deleteAnnouncement(session, id);
    const { announcements } = await listAnnouncements(session, { limit: 50 });

    return jsonOk({ announcements });
  } catch (err) {
    return handleServiceError(err);
  }
}