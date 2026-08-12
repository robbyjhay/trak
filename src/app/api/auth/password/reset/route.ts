import {
  resetPasswordWithToken,
  AuthError,
} from "@/lib/services/auth.service";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * POST /api/auth/password/reset
 * Body: { token, password, confirm }
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      token?: string;
      password?: string;
      confirm?: string;
    }>(req);

    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const confirm = String(body.confirm || "");

    if (!token || !password) {
      return jsonError(400, "Reset token and new password are required.");
    }

    await resetPasswordWithToken(token, password, confirm);

    return jsonOk({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
