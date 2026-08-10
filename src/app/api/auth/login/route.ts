import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { login as authLogin, AuthError } from "@/lib/services/auth.service";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getEnv } from "@/lib/env";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * JSON login alternative to the server-action form login.
 * POST { username, password } → sets session cookie.
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      username?: string;
      password?: string;
    }>(req);

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return jsonError(401, "Username or password not recognised.");
    }

    if (username.length > 64 || password.length > 128) {
      return jsonError(401, "Username or password not recognised.");
    }

    const env = getEnv();
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    const limit = await checkRateLimit(
      `login:${ip}:${username.toLowerCase()}`,
      env.RATE_LIMIT_LOGIN_MAX,
      env.RATE_LIMIT_LOGIN_WINDOW_SEC,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many login attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }

    const result = await authLogin(username, password, {
      ip,
      userAgent: h.get("user-agent"),
    });
    await setSessionCookie(result.rawToken);

    const { user } = result;
    return jsonOk({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isSecretary: user.isSecretary,
        isCorps: user.isCorps,
      },
      mustChangePassword: result.mustChangePassword,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}
