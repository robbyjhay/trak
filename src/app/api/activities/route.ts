import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { createActivity, ServiceError } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";
import type { ActivityType, CreateActivityInput } from "@/lib/types";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const snap = await getSnapshot();
    return jsonOk({ activities: snap.db.activities, dailyLogs: snap.db.dailyLogs });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await parseJsonBody<{
      title?: string;
      type?: ActivityType;
      description?: string;
      createdBy?: string;
      delegatedBy?: string | null;
      startDate?: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      responsibilityIds?: string[];
      location?: string;
    }>(req);

    if (!body.title?.trim()) {
      throw new ServiceError(400, "Title is required");
    }
    if (!body.type || !body.startDate || !body.endDate || !body.startTime) {
      throw new ServiceError(400, "Missing required activity fields");
    }

    const input: Omit<CreateActivityInput, "createdBy"> & {
      createdBy?: string;
      delegatedBy?: string | null;
    } = {
      title: body.title.trim(),
      type: body.type,
      description: body.description || "",
      createdBy: body.createdBy,
      delegatedBy: body.delegatedBy,
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime,
      endTime: body.endTime,
      responsibilityIds: body.responsibilityIds || [],
      location: body.location,
    };

    const activity = await createActivity(session, input);
    const snap = await getSnapshot();
    return jsonOk({
      activity,
      // Include related daily logs created for this activity
      dailyLogs: snap.db.dailyLogs.filter((l) => l.activityId === activity.id),
      notifications: snap.db.notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
