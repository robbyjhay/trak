import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { submitDailyLog, ServiceError } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";
import type { SubmitDailyLogData } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const body = await parseJsonBody<
      SubmitDailyLogData & { date?: string }
    >(req);

    if (!body.date) {
      throw new ServiceError(400, "date is required");
    }

    const { log, activity } = await submitDailyLog(session, id, body.date, {
      objectives: body.objectives,
      activityDescription: body.activityDescription,
      transcript: body.transcript,
      attendanceCount: body.attendanceCount,
      attendanceNotes: body.attendanceNotes,
      attendees: body.attendees,
      attachments: body.attachments,
    });

    const snap = await getSnapshot();
    return jsonOk({
      log,
      activity,
      notifications: snap.db.notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
