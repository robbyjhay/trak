import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { submitOnboardingRequest } from "@/lib/services/onboarding.service";
import { AuthError } from "@/lib/services/auth.service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  jsonError,
  jsonOk,
  parseJsonBody,
  handleServiceError,
} from "@/lib/api/http";

/**
 * POST /api/auth/invite/onboard
 * Body: { token, name, username?, email, designation?, gradeLevel?, sex?,
 *         phone, stateOfOrigin?, dateJoined? }
 * Consumes a head-minted `onboard` token and creates a PENDING onboarding
 * request, then notifies the head. Email is compulsory — the approved login
 * details are emailed to the member.
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      token?: string;
      name?: string;
      username?: string;
      email?: string;
      designation?: string;
      gradeLevel?: string;
      sex?: string;
      phone?: string;
      stateOfOrigin?: string;
      dateJoined?: string;
    }>(req);

    const token = String(body.token || "").trim();
    if (!token) {
      return jsonError(400, "Invite token is required.");
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    if (process.env.NODE_ENV === "production") {
      const limit = await checkRateLimit(`onboard:${ip}`, 5, 900);
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
    }

    const result = await submitOnboardingRequest(token, {
      name: String(body.name || ""),
      username: String(body.username || ""),
      email: String(body.email || ""),
      designation: String(body.designation || ""),
      gradeLevel: String(body.gradeLevel || ""),
      sex: String(body.sex || ""),
      phone: String(body.phone || ""),
      stateOfOrigin: String(body.stateOfOrigin || ""),
      dateJoined: String(body.dateJoined || ""),
    });

    return jsonOk({
      ok: true,
      status: "pending",
      requestId: result.requestId,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.message);
    }
    return handleServiceError(err);
  }
}