import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";
import { delegateSelfDevelopment } from "@/lib/delegation/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const { id } = await params;
    const body = await parseJsonBody<{
      assigneeId?: string;
      dueAt?: string | null;
      notes?: string;
    }>(req);
    const activity = await delegateSelfDevelopment(session, {
      libraryResourceId: id,
      assigneeId: String(body.assigneeId ?? ""),
      dueAt: body.dueAt ?? null,
      notes: body.notes,
    });
    return jsonOk({ activity });
  } catch (err) {
    return handleServiceError(err);
  }
}