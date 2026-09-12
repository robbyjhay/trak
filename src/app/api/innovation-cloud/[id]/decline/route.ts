import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { declineInnovation } from "@/lib/innovation/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    const body = await parseJsonBody<{ reason?: string }>(req);
    const innovation = await declineInnovation(session, id, body.reason);
    return jsonOk({ innovation });
  } catch (err) {
    return handleServiceError(err);
  }
}
