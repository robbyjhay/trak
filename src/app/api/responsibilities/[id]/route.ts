import {
  updateResponsibility,
  type ResponsibilityInput,
} from "@/lib/db/service";
import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await ctx.params;
    const body = await parseJsonBody<Partial<ResponsibilityInput>>(req);
    const responsibility = await updateResponsibility(session, id, {
      code: body.code || "",
      name: body.name || "",
      desc: body.desc || "",
      deliverables: body.deliverables || [],
    });
    return jsonOk({ responsibility });
  } catch (err) {
    return handleServiceError(err);
  }
}
