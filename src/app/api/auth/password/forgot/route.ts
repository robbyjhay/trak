import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/services/auth.service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * POST /api/auth/password/forgot
 * Body: { username?: string; email?: string }
 * Always returns a generic success message (no account enumeration).
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      username?: string;
      email?: string;
      identifier?: string;
    }>(req);

    const identifier = String(
      body.identifier || body.email || body.username || "",
    ).trim();

    if (!identifier || identifier.length > 255) {
      return jsonError(400, "Username or email is required.");
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    const limit = await checkRateLimit(`password-forgot:${ip}`, 5, 900);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many reset requests. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        },
      );
    }

    // Always respond generically whether or not the account/email exists.
    await requestPasswordReset(identifier);

    return jsonOk({
      ok: true,
      message:
        "If an account with that username or email exists and has email on file, a reset link has been sent.",
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
