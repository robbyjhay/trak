import { handleServiceError, jsonOk, parseJsonBody, requireSession } from "@/lib/api/http";
import { saveLinkPreview } from "@/lib/db/service";
import { fetchLinkPreview } from "@/lib/link-preview";
import { sendToUser } from "@/lib/realtime";

export async function POST(req: Request) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await parseJsonBody<{ messageId?: string; messageType?: "dm" | "community"; url?: string }>(req);
    if (!body.messageId || (body.messageType !== "dm" && body.messageType !== "community") || !body.url) {
      return jsonOk({ ok: false });
    }

    const preview = await fetchLinkPreview(body.url);
    if (!preview) {
      return jsonOk({ ok: false });
    }

    await saveLinkPreview(body.messageId, body.messageType, preview);

    sendToUser(session.id, {
      type: "link_preview_ready",
      messageId: body.messageId,
      linkPreview: preview,
    });

    return jsonOk({ ok: true, linkPreview: preview });
  } catch (err) {
    return handleServiceError(err);
  }
}
