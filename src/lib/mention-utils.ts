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

export interface LinkSegment {
  type: "link";
  value: string;
  url: string;
}

export type MessageSegment = TextSegment | MentionSegment | LinkSegment;

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

export function extractUrlFromText(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

/**
 * Split plain text into text and clickable-link segments.
 * Used to render URLs as anchor tags in the message body even without a preview.
 */
export function parseTextWithLinks(text: string): Array<TextSegment | LinkSegment> {
  const segments: Array<TextSegment | LinkSegment> = [];
  let cursor = 0;
  const matches = [...text.matchAll(URL_REGEX)];
  for (const m of matches) {
    const idx = m.index!;
    const raw = m[0];
    let url = raw;
    const cleaned = raw.replace(/[.,;:!?]+$/, "");
    try {
      url = new URL(cleaned).href;
    } catch {
      url = cleaned;
    }
    if (idx > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, idx) });
    }
    segments.push({ type: "link", value: raw, url });
    cursor = idx + raw.length;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }
  return segments.length ? segments : [{ type: "text", value: text }];
}

/**
 * Split message text into text, mention, and clickable-link segments.
 */
export function parseSegmentsWithLinks(
  text: string,
  mentions?: MessageMention[],
): MessageSegment[] {
  const withMentions = parseSegments(text, mentions);
  const out: MessageSegment[] = [];
  for (const seg of withMentions) {
    if (seg.type !== "text") {
      out.push(seg);
      continue;
    }
    for (const sub of parseTextWithLinks(seg.value)) {
      out.push(sub);
    }
  }
  return out;
}

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
