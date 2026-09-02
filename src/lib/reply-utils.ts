import type { ReplyPreview, MessageAttachment } from "@/lib/types";

export function getReplyPreviewText(reply: ReplyPreview): string {
  if (reply.isDeleted) return "Original message unavailable";
  if (reply.text && reply.text.trim()) {
    const t = reply.text.trim();
    return t.length > 80 ? t.slice(0, 80) + "…" : t;
  }
  if (reply.attachments && reply.attachments.length > 0) {
    const att = reply.attachments[0];
    const ct = att.contentType || "";
    if (ct.startsWith("image/")) return "📷 Photo";
    if (ct.startsWith("video/")) return "🎬 Video";
    if (ct.startsWith("audio/")) return "🎤 Voice message";
    return `📎 ${att.name}`;
  }
  return "Original message unavailable";
}

export function getAttachmentPreview(attachments?: MessageAttachment[]): string {
  if (!attachments || attachments.length === 0) return "";
  const att = attachments[0];
  const ct = att.contentType || "";
  if (ct.startsWith("image/")) return "📷 Photo";
  if (ct === "application/pdf") return "📎 document.pdf";
  return `📎 ${att.name}`;
}

/**
 * Validate that a DM reply references a message from the same conversation.
 * Pure helper for testing.
 */
export function isValidDmReply(
  replyTo: { participantA: string; participantB: string } | null,
  currentA: string,
  currentB: string,
): boolean {
  if (!replyTo) return false;
  return replyTo.participantA === currentA && replyTo.participantB === currentB;
}

/**
 * Truncate preview text to fit reply composer.
 */
export function truncatePreview(text: string, max: number = 70): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}
