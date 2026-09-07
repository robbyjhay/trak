
import { saveLinkPreview } from "@/lib/db/service";
import { extractFirstUrl, fetchLinkPreview } from "@/lib/link-preview";
import { sendToUser } from "@/lib/realtime";

export async function processLinkPreviewAsync(
  messageId: string,
  messageType: "dm" | "community",
  text: string,
  senderId: string,
): Promise<void> {
  try {
    const url = extractFirstUrl(text);
    if (!url) return;
    const preview = await fetchLinkPreview(url);
    if (!preview) return;
    await saveLinkPreview(messageId, messageType, preview);
    sendToUser(senderId, {
      type: "link_preview_ready",
      messageId,
      linkPreview: preview,
    });
  } catch {
    // Link previews are best-effort; never fail the message send.
  }
}
