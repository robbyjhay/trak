"use client";

import { useCallback } from "react";
import { useTrak } from "@/context/TrakStore";
import { ANNOUNCEMENT_REACTIONS, isAllowedAnnouncementReaction } from "@/lib/announcements";
import type { AnnouncementReaction } from "@/lib/types";

export function AnnouncementReactions({
  announcementId,
  reactions,
}: {
  announcementId: string;
  reactions: AnnouncementReaction[];
}) {
  const { sessionUser, reactToAnnouncement } = useTrak();
  const me = sessionUser.id;

  const handleReact = useCallback(
    (emoji: string) => {
      void reactToAnnouncement(announcementId, emoji);
    },
    [announcementId, reactToAnnouncement],
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1.5" data-testid={`reactions-${announcementId}`}>
      {ANNOUNCEMENT_REACTIONS.map((emoji) => {
        const summary = reactions.find((r) => r.emoji === emoji);
        const count = summary?.count ?? 0;
        const reactedByMe = summary?.reactedByMe ?? false;
        return (
          <button
            key={emoji}
            type="button"
            data-testid={`react-${emoji}`}
            aria-label={`React ${emoji}`}
            aria-pressed={reactedByMe}
            onClick={(e) => {
              e.stopPropagation();
              if (isAllowedAnnouncementReaction(emoji)) {
                handleReact(emoji);
              }
            }}
            className={[
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none",
              "border transition-all duration-150 select-none cursor-pointer active:scale-90",
              reactedByMe
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-surface-muted border-border text-foreground-secondary hover:bg-surface-hover",
            ].join(" ")}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[11px] font-bold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
