import React, { useMemo, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { useCall } from "@/context/CallContext";
import { cn, formatDuration } from "@/lib/utils";
import { getPresenceStatus } from "@/lib/presence";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PATHS } from "@/components/icons";
import { ANNOUNCEMENT_CHANNEL } from "@/lib/announcements";
import { TrakDb, CallRecord, Dm } from "@/lib/types";
import { motion, useReducedMotion } from "framer-motion";

type ThreadItem =
  | { kind: "dm"; id: string; dm: Dm }
  | { kind: "call"; id: string; call: CallRecord };

function getCreatedAt(item: ThreadItem): number {
  if (item.kind === "dm") return new Date(item.dm.at).getTime();
  if (item.kind === "call") return new Date(item.call.at).getTime();
  return 0;
}

function getMessageSnippet(dm: any): string {
  if (dm.isDeleted) return "This message was deleted";
  const text = dm.text;
  const attachments = dm.attachments;
  if (text?.trim()) return text;
  if (attachments && attachments.length > 0) {
    const type = attachments[0].contentType || "";
    if (type.startsWith("image/")) return "Photo";
    if (type === "application/pdf") return "PDF document";
    return "Attachment";
  }
  return "";
}

function threadItems(db: TrakDb, me: string, other: string): ThreadItem[] {
  return [
    ...db.dms
      .filter(
        (d) =>
          (d.a === me && d.b === other) || (d.a === other && d.b === me),
      )
      .map((dm) => ({ kind: "dm" as const, id: dm.id, dm })),
    ...db.calls
      .filter(
        (c) =>
          (c.a === me && c.b === other) || (c.a === other && c.b === me),
      )
      .map((call) => ({ kind: "call" as const, id: call.id, call })),
  ].sort((x, y) => getCreatedAt(x) - getCreatedAt(y));
}

function formatListTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function ConversationList({
  activeConv,
  setActiveConv,
  mobilePane,
  setMobilePane,
  onNewConv,
}: {
  activeConv: string | null;
  setActiveConv: (id: string) => void;
  mobilePane: "list" | "thread";
  setMobilePane: (v: "list" | "thread") => void;
  onNewConv: () => void;
}) {
  const { sessionUser, users, userMap, db, myNotifications } = useTrak();
  const { activeCall, elapsedSec, onlineUsers, signalingConnected, presenceSynced } = useCall();
  const me = sessionUser.id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const reduceMotion = useReducedMotion();

  const notifs = myNotifications();
  
  // Calculate unread counts from notifications
  const unreadMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifs) {
      if (!n.read && n.type === "dm" && n.messageId) {
        // Find sender from dm
        const dm = db.dms.find(d => d.id === n.messageId);
        if (dm && dm.from !== me) {
          map[dm.from] = (map[dm.from] || 0) + 1;
        }
      }

      if (!n.read && (n.type === "community" || n.type === "mention")) {
        map["community"] = (map["community"] || 0) + 1;
      }
      if (!n.read && n.type === "announcement") {
        map[ANNOUNCEMENT_CHANNEL] = (map[ANNOUNCEMENT_CHANNEL] || 0) + 1;
      }
    }
    return map;
  }, [notifs, db.dms, me]);

  const partners = useMemo(() => {
    const s = new Set<string>();
    s.add(me);
    db.dms.forEach((d) => {
      if (d.a === me) s.add(d.b);
      if (d.b === me) s.add(d.a);
    });
    db.calls.forEach((c) => {
      if (c.a === me) s.add(c.b);
      if (c.b === me) s.add(c.a);
    });
    return [...s].filter(pid => {
      const p = userMap[pid];
      if (!p) return false;
      if (search) {
        const nameMatch = p.name.toLowerCase().includes(search.toLowerCase());
        const selfMatch = pid === me && "you".includes(search.toLowerCase());
        if (!nameMatch && !selfMatch) return false;
      }
      if (filter === "unread" && !unreadMap[pid]) return false;
      return true;
    }).sort((a, b) => {
      // Self-chat is permanently pinned to the top, before all other conversations.
      if (a === me) return -1;
      if (b === me) return 1;

      const aItems = threadItems(db, me, a);
      const bItems = threadItems(db, me, b);
      const aLast = aItems[aItems.length - 1];
      const bLast = bItems[bItems.length - 1];
      
      const aTime = aLast ? (aLast.kind === 'call' ? aLast.call.at : aLast.dm.at) : "";
      const bTime = bLast ? (bLast.kind === 'call' ? bLast.call.at : bLast.dm.at) : "";
      
      return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
    });
  }, [db.dms, users, me, search, filter, unreadMap, userMap]);

  return (
    <div
      className={cn(
        // Viewport-constrained sidebar: flex-1 + min-h-0 pins height to the
        // available viewport region above MobileNav (not to content height).
        // Desktop FAB anchors to this viewport-height box via md:relative;
        // mobile FAB is viewport-fixed and independent of scroll content.
        "relative flex w-full flex-1 min-h-0 flex-col bg-surface md:flex md:w-[320px] lg:w-[360px] xl:w-[400px] md:relative",
        mobilePane === "thread" ? "hidden" : "flex",
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border p-5 pb-4">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-input-border bg-input pl-10 pr-4 py-2.5 text-[13.5px] text-foreground placeholder-input-placeholder outline-none focus:border-border-strong transition-colors shadow-sm"
            suppressHydrationWarning
          />
        </div>
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              className={cn("rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-colors cursor-pointer", filter === f ? "bg-foreground text-background" : "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground")}
            >
              {f === "all" ? "All" : "Unread"}
            </motion.button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pb-[96px] md:pb-3 scrollbar-thin">
        {filter === "all" && !search && (
          <>
            <ConvItem
              active={activeConv === ANNOUNCEMENT_CHANNEL}
              onClick={() => {
                setActiveConv(ANNOUNCEMENT_CHANNEL);
                if (window.innerWidth < 768) window.history.pushState(null, "", "#thread");
                setMobilePane("thread");
              }}
              avatar={
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-sm border border-border/50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path d={PATHS.megaphone} />
                  </svg>
                </div>
              }
              name="Announcements"
              snippet={db.announcements[db.announcements.length - 1] ? getMessageSnippet(db.announcements[db.announcements.length - 1]) : "Unit-wide updates from Head and Secretary"}
              time={db.announcements[db.announcements.length - 1] ? formatListTime(db.announcements[db.announcements.length - 1].at) : undefined}
              unreadCount={unreadMap[ANNOUNCEMENT_CHANNEL]}
            />
            <ConvItem
              active={activeConv === "community"}
              onClick={() => { 
                setActiveConv("community"); 
                if (window.innerWidth < 768) window.history.pushState(null, "", "#thread");
                setMobilePane("thread"); 
              }}
              avatar={
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-interactive text-foreground shadow-sm border border-border/50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PATHS.users} />
                  </svg>
                </div>
              }
              name="Community Chat"
              snippet={db.community[db.community.length - 1] ? (db.community[db.community.length - 1].from === me ? "You: " : "") + getMessageSnippet(db.community[db.community.length - 1]) : "No messages yet"}
              time={db.community[db.community.length - 1] ? formatListTime(db.community[db.community.length - 1].at) : undefined}
              unreadCount={unreadMap["community"]}
            />
            <div className="px-3 pt-5 pb-2 text-[10.5px] font-bold tracking-widest text-foreground-faint uppercase">
              Direct Messages
            </div>
          </>
        )}

        {partners.map((pid, index) => {
          const p = userMap[pid];
          if (!p) return null;
          const items = threadItems(db, me, pid);
          const last = items[items.length - 1];
          const onCall = activeCall?.partnerId === pid;
          const snippet = onCall
            ? activeCall.status === "ringing"
              ? "Ringing…"
              : `On call · ${formatDuration(elapsedSec)}`
            : last
              ? last.kind === "call"
                ? `${last.call.from === me ? "You called" : "Missed call"} · ${formatDuration(last.call.durationSec)}`
                : (last.dm.from === me ? "You: " : "") + getMessageSnippet(last.dm)
              : "Say hello 👋";
          
          let lastTime: string | undefined;
          if (last) {
            lastTime = last.kind === "call" ? last.call.at : last.dm.at;
          }

          const Avatar = (
            <UserAvatar
              photoUrl={p.photoUrl}
              name={p.name}
              color={p.color}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold text-white shadow-sm"
              imgClassName="h-full w-full rounded-full object-cover"
            />
          );

          return (
            <ConvItem
              key={pid}
              index={index}
              active={activeConv === pid}
              onClick={() => {
                setActiveConv(pid);
                if (window.innerWidth < 768) {
                  window.history.pushState(null, "", "#thread");
                }
                setMobilePane("thread");
              }}
              avatar={Avatar}
              name={pid === me ? `${p.name} (You)` : p.name}
              snippet={pid === me && !last ? "Message yourself" : snippet}
              time={lastTime ? formatListTime(lastTime) : undefined}
              unreadCount={unreadMap[pid]}
              pinned={pid === me}
              isOnline={pid !== me ? getPresenceStatus(pid, onlineUsers, signalingConnected, presenceSynced) === "online" : undefined}
            />
          );
        })}
        {partners.length === 0 && search && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center animate-in fade-in duration-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.search} />
              </svg>
            </div>
            <div className="text-[13.5px] font-semibold text-foreground">No matches found</div>
            <div className="text-xs text-foreground-secondary">Try searching for a different name.</div>
          </div>
        )}
      </div>

      {/* FAB: viewport-fixed on mobile (independent of DM list height),
           anchored above MobileNav (76px + 16px gap + safe-area).
           On desktop it anchors to the viewport-constrained sidebar via md:absolute. */}
      <motion.button
        type="button"
        onClick={onNewConv}
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
        className="fixed md:absolute right-5 bottom-[calc(76px+16px+env(safe-area-inset-bottom))] md:bottom-6 z-20 flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-none bg-primary text-primary-foreground shadow-lg transition-transform"
        aria-label="New conversation"
      >
        <motion.span whileTap={reduceMotion ? undefined : { scale: 0.9 }} aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d={PATHS.plus} />
          </svg>
        </motion.span>
      </motion.button>
    </div>
  );
}

function ConvItem({
  active,
  onClick,
  avatar,
  name,
  snippet,
  time,
  unreadCount,
  pinned,
  isOnline,
  index = 0,
}: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  name: string;
  snippet: string;
  time?: string;
  unreadCount?: number;
  pinned?: boolean;
  isOnline?: boolean;
  index?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cn(
        "mb-1 flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border-none p-3 text-left transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards",
        active
          ? "bg-surface-interactive text-foreground shadow-xs"
          : "bg-transparent text-foreground hover:bg-surface-hover hover:translate-x-0.5"
      )}
    >
      <div className="relative">
        {avatar}
        {isOnline !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block h-[10px] w-[10px] rounded-full ring-2 ring-surface transition-colors duration-200",
              isOnline ? "bg-emerald-500" : "bg-gray-400",
            )}
          />
        )}
      </div>
      
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-baseline justify-between mb-0.5">
          <div className={cn("truncate text-[14.5px] font-bold tracking-tight", unreadCount ? "text-foreground" : "text-foreground")}>
            {name}
          </div>
          {time && (
            <div suppressHydrationWarning className={cn("shrink-0 pl-2 text-[11px] font-medium tracking-tight", unreadCount ? "text-primary font-bold" : "text-foreground-faint")}>
              {time}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className={cn("truncate text-[13px] leading-snug", unreadCount ? "text-foreground font-semibold" : "text-foreground-secondary")}>
            {snippet}
          </div>
          {!!unreadCount && (
            <div className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-extrabold text-primary-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </div>
      </div>
      {pinned && (
        <div
          className="shrink-0 text-foreground-faint"
          title="Pinned"
          aria-label="Pinned"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.pushpin} />
          </svg>
        </div>
      )}
    </button>
  );
}
