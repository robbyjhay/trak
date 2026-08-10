import {
  changePassword,
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
 * POST /api/auth/password/change
 * Body: { currentPassword, newPassword, confirm }
 */
export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError(401, "Unauthorized");
    }

    const body = await parseJsonBody<{
      currentPassword?: string;
      newPassword?: string;
      confirm?: string;
    }>(req);

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirm = String(body.confirm || "");

    if (!currentPassword || !newPassword) {
      return jsonError(400, "Current and new password are required.");
    }

    await changePassword(
      session.authUserId,
      currentPassword,
      newPassword,
      confirm,
    );

    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
