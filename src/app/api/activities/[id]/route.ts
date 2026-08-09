import {
  handleServiceError,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { getActivity, updateActivityWrapup } from "@/lib/db/service";
import { getSnapshot } from "@/lib/db/store";
import type { WrapupData } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const activity = await getActivity(id);
    if (!activity) return jsonError(404, "Activity not found");
    const snap = await getSnapshot();
    return jsonOk({
      activity,
      dailyLogs: snap.db.dailyLogs
        .filter((l) => l.activityId === id)
        .sort((a, b) => a.date.localeCompare(b.date)),
      comments: snap.db.comments.filter((c) => c.activityId === id),
    });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const body = await parseJsonBody<WrapupData & { action?: string }>(req);

    if (body.action === "wrapup" || body.initiativeTeamwork !== undefined ||
        body.challenges !== undefined || body.outcomes !== undefined ||
        body.nextSteps !== undefined) {
      const activity = await updateActivityWrapup(session, id, {
        initiativeTeamwork: body.initiativeTeamwork,
        challenges: body.challenges,
        outcomes: body.outcomes,
        nextSteps: body.nextSteps,
      });
      return jsonOk({ activity });
    }

    return jsonError(400, "Unknown patch action");
  } catch (err) {
    return handleServiceError(err);
  }
}
