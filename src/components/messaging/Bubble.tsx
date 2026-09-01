"use no memo";

import React, { useState, useRef, useEffect } from "react";
import { initials, firstName, cn } from "@/lib/utils";
import { parseSegments } from "@/lib/mention-utils";
import type { MessageAttachment, MessageMention } from "@/lib/types";

function formatMessageTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function Bubble({
  fromId,
  text,
  time,
  me,
  userMap,
  showAvatar = true,
  showName = true,
  isLastInGroup = true,
  isFirstInGroup = true,
  isGroup = false,
  attachments,
  onDelete,
  canDeleteAny = false,
  isDeleted = false,
  mentions,
  onMentionClick,
}: {
  fromId: string;
  text: string;
  time: string;
  me: string;
  userMap: any;
  showAvatar?: boolean;
  showName?: boolean;
  isLastInGroup?: boolean;
  isFirstInGroup?: boolean;
  isGroup?: boolean;
  attachments?: MessageAttachment[];
  onDelete?: (forEveryone: boolean) => void;
  canDeleteAny?: boolean;
  isDeleted?: boolean;
}) {
  const isMe = fromId === me;
  const p = userMap[fromId];
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  function openMenu(e: React.MouseEvent) {
    if (!onDelete || isDeleted) return;
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setMenuPos({ x, y });
    setMenuOpen(true);
  }

  function handleAction(forEveryone: boolean) {
    setMenuOpen(false);
    onDelete?.(forEveryone);
  }

  const segments = parseSegments(text, isDeleted ? undefined : mentions);

  return (
    <div
      className={cn(
        "flex max-w-[75%] gap-2.5 group",
        isMe ? "flex-row-reverse self-end" : "self-start",
        !isFirstInGroup && "mt-[-6px]"
      )}
    >
      {/* Avatar column */}
      {isGroup && !isMe && (
        <div className="w-[30px] shrink-0 flex flex-col justify-end">
          {showAvatar ? (
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[11px] font-bold text-white shadow-sm"
              style={{ background: p?.color || "#888" }}
            >
              {p?.photoUrl ? (
                <img src={p.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : initials(p?.name || "?")}
            </div>
          ) : (
            <div className="w-[30px] h-[30px]" />
          )}
        </div>
      )}

      {/* Message content */}
      <div className="flex flex-col min-w-0 max-w-full relative">
        {(!isMe && showName) && (
          <div className="mb-1 ml-1 text-[11.5px] font-bold text-foreground-faint tracking-tight">
            {firstName(p?.name || "")}
          </div>
        )}
        
        <div
          className={cn(
            "relative px-3.5 py-2.5 shadow-sm min-w-[60px]",
            isMe
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-foreground border border-border/40",
            isMe ? "rounded-l-[18px] rounded-tr-[18px]" : "rounded-r-[18px] rounded-tl-[18px]",
            isMe && isLastInGroup ? "rounded-br-sm" : isMe && "rounded-br-[18px]",
            !isMe && isLastInGroup ? "rounded-bl-sm" : !isMe && "rounded-bl-[18px]",
            onDelete && !isDeleted && "cursor-pointer"
          )}
          onContextMenu={openMenu}
          onClick={(e) => {
            if (onDelete && e.detail === 2) {
              openMenu(e);
            }
          }}
        >
          {attachments && attachments.length > 0 && (
            <div className="flex flex-col gap-2 mb-1.5">
              {attachments.map((att) => {
                const isImg = att.contentType.startsWith("image/");
                if (isImg) {
                  return (
                    <a key={att.id} href={`/api/uploads/file?key=${encodeURIComponent(att.storageKey)}`} target="_blank" rel="noreferrer" className="inline-block relative overflow-hidden rounded-[12px] border border-black/5 dark:border-white/5 cursor-pointer bg-surface-muted/50">
                      <img src={`/api/uploads/file?key=${encodeURIComponent(att.storageKey)}`} alt={att.name} className="max-h-[250px] w-auto max-w-full block hover:opacity-90 transition-opacity" />
                    </a>
                  );
                } else {
                  return (
                    <a key={att.id} href={`/api/uploads/file?key=${encodeURIComponent(att.storageKey)}`} target="_blank" rel="noreferrer" className={cn("flex items-center gap-3 p-3 rounded-[12px] no-underline transition-colors", isMe ? "bg-black/10 hover:bg-black/20 text-primary-foreground" : "bg-surface-muted hover:bg-surface-hover text-foreground")}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">{att.name}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{(att.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-70"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                  );
                }
              })}
            </div>
          )}

          {isDeleted ? (
            <div className="flex items-center gap-1.5 italic opacity-60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
              <span className="text-[13px]">deleted a message</span>
            </div>
          ) : text && (
            <div className="text-[14px] leading-[1.4] break-words whitespace-pre-wrap">
              {segments.map((seg, i) => {
                if (seg.type === "text") {
                  return <span key={i}>{seg.value}</span>;
                }
                return (
                  <button
                    key={`mention-${i}-${seg.userId}`}
                    type="button"
                    className={cn(
                      "inline font-bold rounded-[4px] px-0.5 -mx-0.5 border-none bg-transparent cursor-pointer transition-colors align-baseline text-[14px] leading-[1.4]",
                      isMe
                        ? "text-primary-foreground bg-white/20 hover:bg-white/30"
                        : "text-primary bg-primary/10 hover:bg-primary/20"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMentionClick?.(seg.userId);
                    }}
                  >
                    @{seg.displayName}
                  </button>
                );
              })}
            </div>
          )}
          
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1 -mb-0.5",
              isMe ? "text-primary-foreground/70" : "text-foreground-faint"
            )}
          >
            <span suppressHydrationWarning className="text-[10px] font-medium tracking-tight">
              {formatMessageTime(time)}
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[180px] rounded-[14px] border border-border bg-surface shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface-hover cursor-pointer border-none bg-transparent text-left transition-colors"
            onClick={() => handleAction(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Delete for me
          </button>
          {(isGroup ? canDeleteAny : isMe) && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-critical-semantic hover:bg-critical-surface cursor-pointer border-none bg-transparent text-left transition-colors"
              onClick={() => handleAction(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={""} />
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
