import {
  createResponsibility,
  listResponsibilities,
  type ResponsibilityInput,
} from "@/lib/db/service";
import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
  requireSession,
} from "@/lib/api/http";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    const responsibilities = await listResponsibilities();
    return jsonOk({ responsibilities });
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const body = await parseJsonBody<Partial<ResponsibilityInput>>(req);
    const responsibility = await createResponsibility(session, {
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
