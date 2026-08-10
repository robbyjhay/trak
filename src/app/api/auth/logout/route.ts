import { destroyCurrentSession } from "@/lib/auth/session";
import { jsonOk, handleServiceError } from "@/lib/api/http";

export async function POST() {
  try {
    await destroyCurrentSession();
    return jsonOk({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
