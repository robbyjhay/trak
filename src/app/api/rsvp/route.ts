import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api/http";
import { addRsvpAttendee, ServiceError } from "@/lib/db/service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";

/**
 * Public RSVP endpoint — no session required.
 * Body: { token, name, phone?, email?, logId? }
 * Token is cryptographic and required; logId is optional verification only.
 */
export async function POST(req: Request) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    const body = await parseJsonBody<{
      token?: string;
      tok?: string;
      logId?: string;
      name?: string;
      phone?: string;
      email?: string;
    }>(req);

    const token = (body.token || body.tok || "").trim();
    if (!token) {
      throw new ServiceError(400, "RSVP token is required");
    }

    const ipLimit = await checkRateLimit(`rsvp:ip:${ip}`, 10, 3600);
    if (!ipLimit.allowed) {
      throw new ServiceError(429, "Too many RSVP attempts. Try again later.");
    }
    const tokLimit = await checkRateLimit(`rsvp:tok:${token.slice(0, 16)}`, 3, 3600);
    if (!tokLimit.allowed) {
      throw new ServiceError(429, "Too many RSVP attempts for this link.");
    }

    await addRsvpAttendee(
      token,
      {
        name: body.name || "",
        phone: body.phone || "",
        email: body.email || "",
        source: "link",
      },
      body.logId,
    );

    return jsonOk({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
