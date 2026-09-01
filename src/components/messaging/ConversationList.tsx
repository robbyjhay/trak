import React, { useMemo, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { useCall } from "@/context/CallContext";
import { cn, formatDuration, initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { TrakDb, CallRecord, Dm } from "@/lib/types";

type ThreadItem =
  | { kind: "dm"; id: string; dm: Dm }
  | { kind: "call"; id: string; call: CallRecord };

function getCreatedAt(item: ThreadItem): number {
  if (item.kind === "dm") return new Date(item.dm.at).getTime();
  if (item.kind === "call") return new Date(item.call.at).getTime();
  return 0;
}

function getMessageSnippet(text: string, attachments?: { contentType?: string }[]): string {
  if (text.trim()) return text;
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
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ConversationList({
  activeConv,
  setActiveConv,
  mobilePane,
  setMobilePane,
  canBc,
  onNewConv,
}: {
  activeConv: string;
  setActiveConv: (id: string) => void;
  mobilePane: "list" | "thread";
  setMobilePane: (v: "list" | "thread") => void;
  canBc: boolean;
  onNewConv: () => void;
}) {
  const { sessionUser, users, userMap, db, myNotifications } = useTrak();
  const { activeCall, elapsedSec } = useCall();
  const me = sessionUser.id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

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
      if (!n.read && n.type === "broadcast") {
        map["broadcast"] = (map["broadcast"] || 0) + 1;
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
        "relative w-full shrink-0 flex-col border-r border-border bg-surface md:flex md:w-[350px]",
        mobilePane === "thread" ? "hidden" : "flex",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border p-5 pb-4">
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
          <button
            onClick={() => setFilter("all")}
            className={cn("rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-colors cursor-pointer", filter === "all" ? "bg-foreground text-background" : "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground")}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn("rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-colors cursor-pointer", filter === "unread" ? "bg-foreground text-background" : "bg-surface-muted text-foreground-secondary hover:bg-surface-hover hover:text-foreground")}
          >
            Unread
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 pb-20 md:pb-3 scrollbar-thin">
        {filter === "all" && !search && (
          <>
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
              snippet={db.community[db.community.length - 1] ? getMessageSnippet(db.community[db.community.length - 1].text, db.community[db.community.length - 1].attachments) : "No messages yet"}
              time={db.community[db.community.length - 1] ? formatListTime(db.community[db.community.length - 1].at) : undefined}
            />
            {canBc && (
              <ConvItem
                active={activeConv === "broadcast"}
                onClick={() => { 
                  setActiveConv("broadcast"); 
                  if (window.innerWidth < 768) window.history.pushState(null, "", "#thread");
                  setMobilePane("thread"); 
                }}
                avatar={
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-sm border border-border/50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d={PATHS.send} />
                    </svg>
                  </div>
                }
                name="Broadcast"
                snippet="Send an announcement to all"
                unreadCount={unreadMap["broadcast"]}
              />
            )}
            <div className="px-3 pt-5 pb-2 text-[10.5px] font-bold tracking-widest text-foreground-faint uppercase">
              Direct Messages
            </div>
          </>
        )}

        {partners.map((pid) => {
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
                : getMessageSnippet(last.dm.text, last.dm.attachments)
              : "Say hello 👋";
          
          let lastTime: string | undefined;
          if (last) {
            lastTime = last.kind === "call" ? last.call.at : last.dm.at;
          }

          const Avatar = (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold text-white shadow-sm" style={{ background: p.color }}>
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : initials(p.name)}
            </div>
          );

          return (
            <ConvItem
              key={pid}
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
            />
          );
        })}
        {partners.length === 0 && search && (
          <div className="py-10 text-center text-[13px] text-foreground-faint">
            No matches found
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onNewConv}
        className="absolute right-5 bottom-6 z-10 flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-none bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="New conversation"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d={PATHS.plus} />
        </svg>
      </button>
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
}: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  name: string;
  snippet: string;
  time?: string;
  unreadCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-1 flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border-none p-3 text-left transition-all",
        active
          ? "bg-surface-interactive text-foreground shadow-xs"
          : "bg-transparent text-foreground hover:bg-surface-hover"
      )}
    >
      <div className="relative">
        {avatar}
      </div>
      
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-baseline justify-between mb-0.5">
          <div className={cn("truncate text-[14.5px] font-bold tracking-tight", unreadCount ? "text-foreground" : "text-foreground")}>
            {name}
          </div>
          {time && (
            <div className={cn("shrink-0 pl-2 text-[11px] font-medium tracking-tight", unreadCount ? "text-primary font-bold" : "text-foreground-faint")}>
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
    </button>
  );
}
