import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { acceptInvite, AuthError } from "@/lib/services/auth.service";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * POST /api/auth/invite/accept
 * Body: { token, password, confirm } → sets password and session cookie.
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
      return jsonError(400, "Invite token and password are required.");
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    const limit = await checkRateLimit(`invite-accept:${ip}`, 10, 900);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }

    const result = await acceptInvite(token, password, confirm, {
      ip,
      userAgent: h.get("user-agent"),
    });
    await setSessionCookie(result.rawToken);

    return jsonOk({
      ok: true,
      mustChangePassword: false,
      user: {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
