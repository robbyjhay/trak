import type { MessageMention } from "@/lib/types";

interface TextSegment {
  type: "text";
  value: string;
}

interface MentionSegment {
  type: "mention";
  userId: string;
  displayName: string;
}

export type MessageSegment = TextSegment | MentionSegment;

/**
 * Splits message text into text and mention segments using stored positions.
 * Position-based parsing ensures mentions are identified by their character
 * offset in the text, not by string matching. This prevents:
 * - False positives from text that happens to contain "@Name"
 * - Incorrect links when display names change after the message is sent
 * - Ambiguity with similar display names
 */
export function parseSegments(text: string, mentions?: MessageMention[]): MessageSegment[] {
  if (!mentions || mentions.length === 0) {
    return [{ type: "text", value: text }];
  }

  const sorted = [...mentions].sort((a, b) => a.position - b.position);
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const mention of sorted) {
    const pos = mention.position;
    if (pos < cursor || pos >= text.length) continue;

    if (pos > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, pos) });
    }
    const mentionText = `@${mention.displayName}`;
    const actualText = text.slice(pos, pos + mentionText.length);
    segments.push({
      type: "mention",
      userId: mention.userId,
      displayName: actualText.startsWith("@") ? actualText.slice(1) : mention.displayName,
    });
    cursor = pos + mentionText.length;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
