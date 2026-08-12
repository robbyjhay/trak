import {
  setInitialPassword,
  AuthError,
} from "@/lib/services/auth.service";
import { readSession } from "@/lib/auth/session";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * POST /api/auth/password/set-initial
 * Body: { password, confirm }
 * Requires session + mustChangePassword.
 */
export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError(401, "Unauthorized");
    }
    if (!session.mustChangePassword) {
      return jsonError(400, "Password change is not required.");
    }

    const body = await parseJsonBody<{
      password?: string;
      confirm?: string;
    }>(req);

    const password = String(body.password || "");
    const confirm = String(body.confirm || "");

    await setInitialPassword(
      session.authUserId || session.id,
      password,
      confirm,
      session.username,
    );

    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
