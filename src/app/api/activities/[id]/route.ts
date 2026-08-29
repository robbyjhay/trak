import {
  handleServiceError,
  jsonError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import {
  getActivity,
  getActivityComments,
  getActivityLogs,
  toggleActivityHidden,
  updateActivityWrapup,
  updateActivityEndDate,
  updateActivityMetadata,
  softDeleteActivity,
} from "@/lib/db/service";
import type { WrapupData } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const activity = await getActivity(session, id);
    if (!activity) return jsonError(404, "Activity not found");

    const [dailyLogs, comments] = await Promise.all([
      getActivityLogs(session, id),
      getActivityComments(session, id),
    ]);

    return jsonOk({ activity, dailyLogs, comments });
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
    const body = await parseJsonBody<any>(req);

    if (body.action === "toggleHidden") {
      const activity = await toggleActivityHidden(session, id);
      return jsonOk({ activity });
    }
    
    if (body.action === "updateDates") {
      const activity = await updateActivityEndDate(session, id, body.endDate);
      return jsonOk({ activity });
    }
    
    if (body.action === "updateMetadata") {
      const activity = await updateActivityMetadata(session, id, body);
      return jsonOk({ activity });
    }
    
    if (body.action === "softDelete") {
      const activity = await softDeleteActivity(session, id);
      return jsonOk({ activity });
    }

    if (
      body.action === "wrapup" ||
      body.initiativeTeamwork !== undefined ||
      body.challenges !== undefined ||
      body.outcomes !== undefined ||
      body.nextSteps !== undefined
    ) {
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
