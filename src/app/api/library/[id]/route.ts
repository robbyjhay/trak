import {
  handleServiceError,
  jsonOk,
  requireSession,
} from "@/lib/api/http";
import { getLibraryResource } from "@/lib/library/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await params;
    const resource = await getLibraryResource(session, id);
    return jsonOk({ resource });
  } catch (err) {
    return handleServiceError(err);
  }
}
