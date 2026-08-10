import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  getActivityLogs,
  myNotifications,
  submitDailyLog,
  ServiceError,
} from "@/lib/db/service";
import type { SubmitDailyLogData } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const dailyLogs = await getActivityLogs(session, id);
    return jsonOk({ dailyLogs });
  } catch (err) {
    return handleServiceError(err);
  }
}

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
      amountReleasedNgn: body.amountReleasedNgn,
      amountSpentNgn: body.amountSpentNgn,
      spendingItems: body.spendingItems,
    });

    const notifications = await myNotifications(session);
    return jsonOk({
      log,
      activity,
      notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
