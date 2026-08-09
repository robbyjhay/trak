import { clearSessionCookie } from "@/lib/auth/session";
import { jsonOk, handleServiceError } from "@/lib/api/http";

export async function POST() {
  try {
    await clearSessionCookie();
    return jsonOk({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
