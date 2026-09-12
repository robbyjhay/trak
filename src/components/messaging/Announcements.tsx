"use client";

import { useMemo, useState, useCallback } from "react";
import { useTrak } from "@/context/TrakStore";
import { canSendAnnouncement } from "@/lib/announcements";
import { isNetworkError } from "@/lib/api/client";
import type { Dm } from "@/lib/types";
import { ChatThread } from "./ChatThread";
import { Composer, type ReplyingTo } from "./Composer";

export function AnnouncementsPanel() {
  const { sessionUser, users, userMap, db, sendAnnouncement, deleteAnnouncement, showToast, reactToAnnouncement } = useTrak();
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyingTo>(null);
  const me = sessionUser.id;
  const canBc = canSendAnnouncement(sessionUser);
  const canDeleteAny = sessionUser.role === "head";

  const items = useMemo(() => {
    return [...db.announcements]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .map((a) => ({
        kind: "dm" as const,
        id: a.id,
        dm: {
          id: a.id,
          a: a.from,
          b: "announcements",
          from: a.from,
          text: a.text,
          at: a.at,
        } as Dm,
      }));
  }, [db.announcements]);

  const handleReplySelect = useCallback(
    (messageId: string) => {
      const ann = db.announcements.find((a) => a.id === messageId);
      if (ann) {
        setReplyingTo({ id: ann.id, from: ann.from, text: ann.text });
      }
    },
    [db.announcements],
  );

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <ChatThread
        items={items}
        me={me}
        userMap={userMap}
        isGroup={true}
        onReply={handleReplySelect}
        onDeleteMessage={(messageId, forEveryone) => {
          void deleteAnnouncement(messageId).catch(() =>
            showToast("Could not delete announcement", "Please try again."),
          );
        }}
        canDeleteAny={canDeleteAny}
        reactions={Object.fromEntries(db.announcements.map((a) => [a.id, a.reactions || []]))}
        onReact={(messageId, emoji) => {
          void reactToAnnouncement(messageId, emoji);
        }}
      />

      {canBc ? (
        <Composer
          value={input}
          onChange={setInput}
          placeholder="Post an announcement…"
          users={users}
          currentUserId={me}
          showMentions={true}
          replyingTo={replyingTo}
          onCancelReply={cancelReply}
          userMap={userMap}
          onSend={(attachments, mentions) => {
            if (!input.trim()) return;
            const text = input.trim();
            setInput("");
            setReplyingTo(null);
            void sendAnnouncement(text)
              .then(() => {
                showToast(
                  "Announcement posted",
                  `Delivered to all ${users.length} unit members.`,
                );
              })
              .catch((err) => {
                showToast(
                  isNetworkError(err)
                    ? "Could not post announcement — no connection"
                    : "Could not post announcement",
                  isNetworkError(err)
                    ? "Check your connection and try again. It wasn't delivered."
                    : "Please try again.",
                );
              });
          }}
        />
      ) : (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border bg-surface px-4 py-3 text-[12.5px] font-semibold text-foreground-secondary sm:px-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
          Only the Unit Head and Secretary can post announcements.
        </div>
      )}
    </div>
  );
}
