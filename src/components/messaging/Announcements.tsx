"use client";

import { useMemo, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { cn, firstName } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PATHS } from "@/components/icons";
import { parseSegmentsWithLinks } from "@/lib/mention-utils";
import {
  ANNOUNCEMENT_REACTIONS,
  canDeleteAnnouncement,
  canSendAnnouncement,
} from "@/lib/announcements";
import type { Announcement } from "@/lib/types";

function formatAnnouncementTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const sameMonth = new Date().toDateString() === d.toDateString();
  if (sameMonth) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AnnouncementCard({
  announcement,
}: {
  announcement: Announcement;
}) {
  const { sessionUser, userMap, deleteAnnouncement, reactToAnnouncement } = useTrak();
  const sender = userMap[announcement.from];
  const byEmoji = useMemo(() => {
    const map = new Map<string, (typeof announcement.reactions)[number]>();
    for (const r of announcement.reactions) map.set(r.emoji, r);
    return map;
  }, [announcement.reactions]);

  const canDelete = canDeleteAnnouncement(sessionUser, announcement);
  const isHead = sessionUser.role === "head";

  return (
    <article
      data-testid={`announcement-${announcement.id}`}
      className="rounded-[18px] border border-border bg-surface p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          photoUrl={sender?.photoUrl}
          name={sender?.name || "?"}
          color={sender?.color || "#888"}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white shadow-sm"
          imgClassName="h-full w-full rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-bold text-foreground tracking-tight">
              {firstName(sender?.name || "Unit member")}
            </span>
            {isHead && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
                {roleLabel(sender || { role: "member", isSecretary: false })}
              </span>
            )}
            <span suppressHydrationWarning className="ml-auto shrink-0 text-[11px] font-medium text-foreground-faint">
              {formatAnnouncementTime(announcement.at)}
            </span>
          </div>
          <div className="mt-1.5 text-[14.5px] leading-[1.5] text-foreground break-words whitespace-pre-wrap">
            {parseSegmentsWithLinks(announcement.text).map((seg, i) => {
              if (seg.type === "link") {
                return (
                  <a
                    key={`link-${i}`}
                    href={seg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline no-underline font-medium break-all text-primary decoration-primary/40 underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {seg.value}
                  </a>
                );
              }
              if (seg.type === "mention") {
                return (
                  <span key={`mention-${i}`} className="inline font-bold text-primary">
                    @{seg.displayName}
                  </span>
                );
              }
              return <span key={i}>{seg.value}</span>;
            })}
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              void deleteAnnouncement(announcement.id).catch(() => {});
            }}
            aria-label="Delete announcement"
            data-testid={`delete-announcement-${announcement.id}`}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-foreground-faint transition-colors hover:border-critical-semantic/40 hover:bg-critical-surface hover:text-critical-semantic"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.trash} />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
        {ANNOUNCEMENT_REACTIONS.map((emoji) => {
          const summary = byEmoji.get(emoji);
          const active = Boolean(summary?.reactedByMe);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                void reactToAnnouncement(announcement.id, emoji).catch(() => {});
              }}
              aria-pressed={active}
              aria-label={`React with ${emoji}`}
              className={cn(
                "inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border border-border/70 px-2.5 text-[13px] font-semibold transition-all",
                active
                  ? "border-primary bg-primary/10 text-foreground shadow-xs"
                  : "bg-surface-muted text-foreground-secondary hover:border-primary/40 hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <span aria-hidden>{emoji}</span>
              {summary && summary.count > 0 && (
                <span className={cn("text-[11px]", active ? "text-primary" : "text-foreground-faint")}>
                  {summary.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function AnnouncementsPanel() {
  const { sessionUser, users, db, sendAnnouncement, showToast } = useTrak();
  const [draft, setDraft] = useState("");
  const canBc = canSendAnnouncement(sessionUser);

  const announcements = useMemo(
    () =>
      [...db.announcements].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [db.announcements],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 scrollbar-thin">
        {announcements.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-surface-muted text-foreground-faint border border-border/50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.megaphone} />
              </svg>
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-foreground">No announcements yet</div>
              <div className="mt-1 text-[13px] text-foreground-secondary">
                {canBc
                  ? "Post the first announcement for your unit."
                  : "Unit announcements from your head and secretary appear here."}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </div>

      {canBc ? (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 rounded-[18px] border border-input-border bg-input px-3.5 py-2.5 shadow-sm transition-colors focus-within:border-border-strong">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write an announcement for the whole unit…"
                rows={Math.min(4, Math.max(1, draft.split("\n").length))}
                className="min-h-[40px] w-full resize-none bg-transparent py-1.5 text-[14px] text-foreground placeholder-input-placeholder outline-none scrollbar-thin"
                suppressHydrationWarning
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  if (!draft.trim()) return;
                  const text = draft.trim();
                  setDraft("");
                  void sendAnnouncement(text)
                    .then(() => {
                      showToast(
                        "Announcement posted",
                        `Delivered to all ${users.length} unit members.`,
                      );
                    })
                    .catch(() => {
                      showToast(
                        "Could not post announcement",
                        "Please try again.",
                      );
                    });
                }}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-end rounded-full border-none bg-primary text-primary-foreground shadow-sm transition-transform hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Post announcement"
                data-testid="post-announcement"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d={PATHS.send} />
                </svg>
              </button>
            </div>
            <div className="mt-1.5 px-1 text-[11px] font-medium text-foreground-faint">
              Only the Unit Head and Secretary can post announcements. Members can read and react.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border bg-surface px-4 py-3 text-[12.5px] font-semibold text-foreground-secondary sm:px-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
          Only the Unit Head and Secretary can post announcements. Members can read and react.
        </div>
      )}
    </div>
  );
}