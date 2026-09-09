/**
 * Unit Announcements — client-safe rules and constants.
 * Single source of truth shared by the service layer, the UI, and tests.
 * No server-only imports (safe for client components and unit tests).
 */
import type { UserRole } from "@/lib/types";
import { canBroadcast } from "@/lib/permissions";

/** The app is a single-unit deployment ("Digital Learning Unit"). */
export const DEFAULT_UNIT_ID = "dlu";

/** Artificial conversation key used by the messaging UI (mirrors "community"/"broadcast"). */
export const ANNOUNCEMENT_CHANNEL = "announcements";

/** The five default reactions every unit member can use on announcements. */
export const ANNOUNCEMENT_REACTIONS = ["👍", "❤️", "😂", "👏", "🔥"] as const;

export const MAX_ANNOUNCEMENT_LENGTH = 4000;

/** Head and Secretary can post announcements — same rule as Broadcast. */
export const canSendAnnouncement = canBroadcast;

export function isAllowedAnnouncementReaction(
  emoji: unknown,
): emoji is (typeof ANNOUNCEMENT_REACTIONS)[number] {
  return (
    typeof emoji === "string" &&
    (ANNOUNCEMENT_REACTIONS as readonly string[]).includes(emoji)
  );
}

export function canDeleteAnnouncement(
  user: { role: UserRole; id: string },
  announcement: { from: string },
): boolean {
  return user.role === "head" || announcement.from === user.id;
}

export interface AnnouncementReactionSummary {
  emoji: string;
  count: number;
  reactors: string[];
  reactedByMe: boolean;
}

/** Aggregate raw reactions into a per-emoji summary, ordered by the default set. */
export function summarizeReactions(
  reactions: { userId: string; emoji: string }[],
  viewerId: string,
): AnnouncementReactionSummary[] {
  const byEmoji = new Map<string, string[]>();
  for (const r of reactions) {
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r.userId);
    byEmoji.set(r.emoji, list);
  }
  const out: AnnouncementReactionSummary[] = [];
  for (const emoji of ANNOUNCEMENT_REACTIONS) {
    const reactors = byEmoji.get(emoji) ?? [];
    if (reactors.length === 0) continue;
    out.push({
      emoji,
      count: reactors.length,
      reactors,
      reactedByMe: reactors.includes(viewerId),
    });
  }
  return out;
}