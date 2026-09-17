import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { getLibraryResource, updateLibraryResource } from "@/lib/library/service";

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await params;
    const body = await parseJsonBody<{
      title?: string;
      category?: string;
      description?: string;
      externalUrl?: string;
      thumbnailKey?: string | null;
    }>(req);
    const resource = await updateLibraryResource(session, id, body);
    return jsonOk({ resource });
  } catch (err) {
    return handleServiceError(err);
  }
}
