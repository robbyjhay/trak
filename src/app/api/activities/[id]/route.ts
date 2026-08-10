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
  softDeleteActivity,
  toggleActivityHidden,
  updateActivityWrapup,
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
    const body = await parseJsonBody<
      WrapupData & { action?: string }
    >(req);

    if (body.action === "toggleHidden") {
      const activity = await toggleActivityHidden(session, id);
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
