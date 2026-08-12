import {
  skipPasswordChange,
  AuthError,
} from "@/lib/services/auth.service";
import { readSession } from "@/lib/auth/session";
import { isDevLoginEnabled } from "@/lib/env";
import { jsonError, jsonOk, handleServiceError } from "@/lib/api/http";

/**
 * POST /api/auth/password/skip
 * Clears mustChangePassword without changing the password.
 * Dev only (ENABLE_DEV_LOGIN). Production always 403.
 */
export async function POST() {
  try {
    if (!isDevLoginEnabled()) {
      return jsonError(403, "Skip password is disabled outside development.");
    }

    const session = await readSession();
    if (!session) {
      return jsonError(401, "Unauthorized");
    }

    const userId = session.authUserId || session.id;
    await skipPasswordChange(userId);

    return jsonOk({
      ok: true,
      mustChangePassword: false,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
