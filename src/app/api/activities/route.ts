import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  createActivity,
  listActivitiesForSession,
  ServiceError,
  getActivityLogs,
  myNotifications,
} from "@/lib/db/service";
import { parsePagination, pageMeta } from "@/lib/api/pagination";
import type { ActivityType, CreateActivityInput } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const url = new URL(req.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { activities, total } = await listActivitiesForSession(session, {
      page,
      limit,
    });

    // Include logs only for this page of activities (scoped).
    const logsNested = await Promise.all(
      activities.map((a) => getActivityLogs(session, a.id)),
    );
    const dailyLogs = logsNested.flat();

    return jsonOk({
      activities,
      dailyLogs,
      meta: pageMeta(total, page, limit),
    });
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
      hasBudget?: boolean;
      estimatedAmountNgn?: number | null;
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
      hasBudget: body.hasBudget,
      estimatedAmountNgn: body.estimatedAmountNgn,
    };

    const activity = await createActivity(session, input);
    const dailyLogs = await getActivityLogs(session, activity.id);
    const notifications = await myNotifications(session);

    return jsonOk({
      activity,
      dailyLogs,
      notifications,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
