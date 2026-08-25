import React, { useRef, useEffect } from "react";
import { Bubble } from "./Bubble";
import { CallRecord, Dm } from "@/lib/types";
import { PATHS } from "@/components/icons";
import { formatDuration } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/dates";

type ThreadItem =
  | { kind: "dm"; id: string; dm: Dm }
  | { kind: "call"; id: string; call: CallRecord };

function formatMessageTime(isoString: string): string {
  return formatRelativeDate(isoString);
}

function formatDateSeparator(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return "Today";
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-US", { weekday: 'long', month: "short", day: "numeric" });
}

export function ChatThread({
  items,
  me,
  userMap,
  isGroup,
  onDeleteMessage,
  canDeleteAny = false,
}: {
  items: ThreadItem[];
  me: string;
  userMap: any;
  isGroup?: boolean;
  onDeleteMessage?: (messageId: string, forEveryone: boolean) => void;
  canDeleteAny?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length]);

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-foreground-faint">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.messages} />
          </svg>
        </div>
        <div className="text-[14.5px] font-bold text-foreground">No messages yet</div>
        <div className="mt-1 text-[13px] text-foreground-secondary">Say hello to start the conversation</div>
      </div>
    );
  }

  // Grouping logic
  const grouped: React.ReactNode[] = [];
  let lastDate = "";
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prev = i > 0 ? items[i - 1] : null;
    const next = i < items.length - 1 ? items[i + 1] : null;
    
    const itemTime = item.kind === "call" ? item.call.at : item.dm.at;
    const dateStr = new Date(itemTime).toDateString();
    
    if (dateStr !== lastDate) {
      grouped.push(
        <div key={`date-${dateStr}`} className="my-6 flex justify-center">
          <div className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold tracking-tight text-foreground-faint shadow-xs">
            {formatDateSeparator(itemTime)}
          </div>
        </div>
      );
      lastDate = dateStr;
    }

    if (item.kind === "call") {
      grouped.push(
        <div key={item.id} className="my-2 flex justify-center">
          <CallPill call={item.call} me={me} />
        </div>
      );
    } else {
      const fromId = item.dm.from;
      const prevFromId = prev?.kind === "dm" ? prev.dm.from : null;
      const nextFromId = next?.kind === "dm" ? next.dm.from : null;
      
      const prevTime = prev ? new Date(prev.kind === "call" ? prev.call.at : prev.dm.at).getTime() : 0;
      const currTime = new Date(itemTime).getTime();
      const nextTime = next ? new Date(next.kind === "call" ? next.call.at : next.dm.at).getTime() : 0;
      
      const isFirstInGroup = prevFromId !== fromId || (currTime - prevTime > 5 * 60 * 1000) || prev?.kind === "call";
      const isLastInGroup = nextFromId !== fromId || (nextTime - currTime > 5 * 60 * 1000) || next?.kind === "call";

      grouped.push(
        <Bubble
          key={item.id}
          fromId={fromId}
          text={item.dm.text}
          time={item.dm.at}
          me={me}
          userMap={userMap}
          showName={isGroup ? isFirstInGroup : false}
          showAvatar={isGroup ? isLastInGroup : false}
          isFirstInGroup={isFirstInGroup}
          isLastInGroup={isLastInGroup}
          isGroup={isGroup}
          attachments={item.dm.attachments}
          onDelete={onDeleteMessage ? (forEveryone) => onDeleteMessage(item.id, forEveryone) : undefined}
          canDeleteAny={canDeleteAny}
          isDeleted={(item.dm as any).isDeleted}
        />
      );
    }
  }

  return (
    <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-background px-4 py-5 sm:px-6 md:px-8 scroll-smooth scrollbar-thin">
      {grouped}
    </div>
  );
}

function CallPill({
  call,
  me,
}: {
  call: CallRecord;
  me: string;
}) {
  const outgoing = call.from === me;
  const missed = call.durationSec === 0;
  
  return (
    <div className="flex w-fit max-w-full items-center gap-2.5 rounded-[14px] border border-border/50 bg-surface px-3 py-2 shadow-sm">
      <span
        className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ${
          missed && !outgoing
            ? "bg-critical-surface text-critical-semantic" 
            : outgoing
              ? "bg-primary/10 text-primary"
              : "bg-surface-muted text-foreground-secondary"
        }`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={outgoing ? "rotate-[-45deg]" : "rotate-[135deg]"}
        >
          <path d={PATHS.phone} />
        </svg>
      </span>
      <div className="flex flex-col">
        <span className="text-[12.5px] font-bold text-foreground">
          {outgoing ? "You called" : missed ? "Missed call" : "Incoming call"}
        </span>
        <span className="text-[10.5px] font-medium text-foreground-faint">
          {missed ? "Missed" : formatDuration(call.durationSec)}
        </span>
      </div>
      <span className="ml-3 text-[10.5px] font-medium text-foreground-faint self-start mt-0.5">
        {formatMessageTime(call.at)}
      </span>
    </div>
  );
}
