import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { declineLibraryResource } from "@/lib/library/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await params;
    const body = await parseJsonBody<{ reason?: string }>(req);
    const resource = await declineLibraryResource(session, id, body.reason);
    return jsonOk({ resource });
  } catch (err) {
    return handleServiceError(err);
  }
}
