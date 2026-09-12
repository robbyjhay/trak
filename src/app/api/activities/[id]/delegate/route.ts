import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { delegateUnitWork } from "@/lib/delegation/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await params;
    const body = await parseJsonBody<{ assigneeId?: string }>(req);
    const activity = await delegateUnitWork(session, {
      activityId: id,
      assigneeId: String(body.assigneeId ?? ""),
    });
    return jsonOk({ activity });
  } catch (err) {
    return handleServiceError(err);
  }
}
