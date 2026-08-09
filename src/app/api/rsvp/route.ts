import {
  handleServiceError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api/http";
import { addRsvpAttendee, ServiceError } from "@/lib/db/service";

/**
 * Public RSVP endpoint — no session required.
 * Body: { logId, name, phone?, email? }
 */
export async function POST(req: Request) {
  try {
    const body = await parseJsonBody<{
      logId?: string;
      name?: string;
      phone?: string;
      email?: string;
    }>(req);

    if (!body.logId) {
      throw new ServiceError(400, "logId is required");
    }

    await addRsvpAttendee(body.logId, {
      name: body.name || "",
      phone: body.phone || "",
      email: body.email || "",
      source: "link",
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
