import { handleServiceError, jsonOk, requireSession } from "@/lib/api/http";
import { implementInnovation } from "@/lib/innovation/service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await params;
    const innovation = await implementInnovation(session, id);
    return jsonOk({ innovation });
  } catch (err) {
    return handleServiceError(err);
  }
}
