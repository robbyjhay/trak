"use no memo";

import React, { useState, useRef, useEffect } from "react";
import { initials, firstName, cn, copyToClipboard } from "@/lib/utils";
import { parseSegments } from "@/lib/mention-utils";
import { scrollToMessage } from "@/lib/message-scroll";
import { PATHS } from "@/components/icons";
import type { MessageAttachment, MessageMention, ReplyPreview } from "@/lib/types";

function formatMessageTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getReplyPreviewText(reply: ReplyPreview): string {
  if (reply.isDeleted) return "Original message unavailable";
  if (reply.text && reply.text.trim()) {
    const t = reply.text.trim();
    return t.length > 80 ? t.slice(0, 80) + "…" : t;
  }
  if (reply.attachments && reply.attachments.length > 0) {
    const att = reply.attachments[0];
    const ct = att.contentType || "";
    if (ct.startsWith("image/")) return "📷 Photo";
    if (ct.startsWith("video/")) return "🎬 Video";
    if (ct.startsWith("audio/")) return "🎤 Voice message";
    return `📎 ${att.name}`;
  }
  return "Original message unavailable";
}

export function Bubble({
  id,
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
  isDeleted = false,
  mentions,
  onMentionClick,
  replyTo,
  replyToId,
  onReply,
  onDelete,
  canDeleteAny = false,
  isHighlighted = false,
}: {
  id: string;
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
  isDeleted?: boolean;
  mentions?: MessageMention[];
  onMentionClick?: (userId: string) => void;
  replyTo?: ReplyPreview | null;
  replyToId?: string | null;
  onReply?: (messageId: string) => void;
  onDelete?: (forEveryone: boolean) => void;
  canDeleteAny?: boolean;
  isHighlighted?: boolean;
}) {
  const isMe = fromId === me;
  const p = userMap[fromId];
  const replySender = replyTo ? userMap[replyTo.from] : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Swipe state
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<"h" | "v" | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMovedRef = useRef(false);

  const THRESHOLD = 55;
  const MAX_TRANSLATE = 72;

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

  function openMenuAt(x: number, y: number) {
    if (isDeleted) return;
    // Allow menu if any action available (reply/copy/delete)
    if (!onReply && !onDelete) return;
    const cx = Math.min(x, window.innerWidth - 200);
    const cy = Math.min(y, window.innerHeight - 140);
    setMenuPos({ x: cx, y: cy });
    setMenuOpen(true);
  }

  function openMenu(e: React.MouseEvent) {
    if (isDeleted) return;
    if (!onReply && !onDelete) return;
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  }

  function handleReply() {
    setMenuOpen(false);
    if (id && onReply) onReply(id);
  }

  async function handleCopy() {
    setMenuOpen(false);
    try {
      await copyToClipboard(text || "");
    } catch {}
  }

  function handleDelete(forEveryone: boolean) {
    setMenuOpen(false);
    onDelete?.(forEveryone);
  }

  function handleReplyPreviewClick() {
    if (!replyTo?.id) return;
    // If the original exists in DOM, scroll to it; otherwise do nothing graceful
    const ok = scrollToMessage(replyTo.id);
    if (!ok) {
      // Could show toast? For now just no-op per spec fallback
    }
  }

  // Touch handlers for swipe-to-reply + long-press menu
  function onTouchStart(e: React.TouchEvent) {
    if (isDeleted) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    directionRef.current = null;
    hasMovedRef.current = false;
    setIsDragging(true);
    // Long press to open menu (distinct from swipe)
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!hasMovedRef.current && directionRef.current !== "h") {
        openMenuAt(t.clientX, t.clientY);
        // Reset swipe
        setOffsetX(0);
        setIsDragging(false);
      }
    }, 520);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (isDeleted) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;

    if (!directionRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        directionRef.current = "h";
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        directionRef.current = "v";
        // Cancel long press, let vertical scroll continue
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        setIsDragging(false);
        setOffsetX(0);
        return;
      } else {
        return;
      }
    }

    if (directionRef.current === "v") return;

    // Horizontal swipe
    hasMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (dx < 0) {
      // left swipe — ignore, snap back
      setOffsetX(0);
      return;
    }

    // Only allow right swipe
    // Apply drag factor for natural feel
    const dampened = Math.min(dx * 0.55, MAX_TRANSLATE);
    setOffsetX(dampened);
    // Prevent vertical scrolling while swiping horizontally
    if (Math.abs(dx) > 12) {
      // @ts-ignore
      if (e.cancelable) e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (directionRef.current !== "h") {
      setIsDragging(false);
      setOffsetX(0);
      directionRef.current = null;
      return;
    }

    const finalOffset = offsetX;
    setIsDragging(false);
    directionRef.current = null;

    if (finalOffset >= THRESHOLD) {
      // Trigger reply
      setOffsetX(0);
      if (onReply) onReply(id);
    } else {
      // Snap back
      setOffsetX(0);
    }
  }

  const segments = parseSegments(text, isDeleted ? undefined : mentions);

  // Drag progress for icon opacity/scale
  const dragProgress = Math.min(offsetX / THRESHOLD, 1);

  return (
    <div
      className={cn(
        "flex max-w-[75%] gap-2.5 group relative",
        isMe ? "flex-row-reverse self-end" : "self-start",
        !isFirstInGroup && "mt-[-6px]",
        isHighlighted && "ring-2 ring-primary ring-offset-1 rounded-[18px]"
      )}
      data-message-id={id}
      data-testid={`message-${id}`}
    >
      {/* Swipe reply indicator — behind the bubble, always at left edge so it is visible during right swipe */}
      {offsetX > 8 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 -ml-10 flex items-center justify-center pointer-events-none select-none"
          style={{
            opacity: dragProgress,
            transform: `translateY(-50%) scale(${0.85 + dragProgress * 0.15})`,
          }}
          aria-hidden
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border shadow-sm text-foreground-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
        </div>
      )}

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
      <div
        className="flex flex-col min-w-0 max-w-full relative"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
            !isDeleted && "cursor-pointer",
            "select-text"
          )}
          style={{ touchAction: "pan-y" } as any}
          onContextMenu={openMenu}
          onClick={(e) => {
            if (!isDeleted && e.detail === 2) {
              openMenu(e);
            }
          }}
          data-testid={`bubble-${id}`}
        >
          {/* Reply preview inside bubble */}
          {replyTo ? (
            <button
              type="button"
              onClick={handleReplyPreviewClick}
              className={cn(
                "mb-2 flex w-full cursor-pointer items-stretch gap-0 overflow-hidden rounded-[12px] border-l-[3.5px] bg-black/5 text-left transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
                isMe ? "border-white/50" : "border-primary",
                !replyTo.isDeleted && "hover:opacity-95"
              )}
              style={{ WebkitTapHighlightColor: "transparent" } as any}
              aria-label="Jump to original message"
            >
              <div className="min-w-0 flex-1 px-2.5 py-1.5">
                <div className={cn("truncate text-[11.5px] font-bold leading-tight", isMe ? "text-primary-foreground" : "text-primary")}>
                  {replySender ? firstName(replySender.name) : replyTo.isDeleted ? "" : firstName(userMap[replyTo.from]?.name || "Unknown")}
                </div>
                <div className={cn("truncate text-[12.5px] leading-tight mt-0.5", isMe ? "text-primary-foreground/90" : "text-foreground-secondary")}>
                  {getReplyPreviewText(replyTo)}
                </div>
              </div>
              {replyTo.attachments && replyTo.attachments.length > 0 && replyTo.attachments[0].contentType?.startsWith("image/") && !replyTo.isDeleted && (
                <div className="w-[42px] shrink-0 bg-black/5 dark:bg-white/5">
                  <img
                    src={`/api/uploads/file?key=${encodeURIComponent(replyTo.attachments[0].storageKey)}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </button>
          ) : replyToId ? (
            <div className={cn("mb-2 rounded-[12px] border-l-[3.5px] px-2.5 py-1.5 text-[12.5px] italic", isMe ? "border-white/40 bg-black/10 text-primary-foreground/80" : "border-border bg-surface-muted text-foreground-faint")}>
              Original message unavailable
            </div>
          ) : null}

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
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
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

      {/* Context Menu — Reply, Copy, Delete for me/everyone */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[180px] rounded-[14px] border border-border bg-surface shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menuPos.x, top: menuPos.y }}
          data-testid="message-context-menu"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface-hover cursor-pointer border-none bg-transparent text-left transition-colors"
            onClick={handleReply}
            data-testid="reply-action"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            Reply
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface-hover cursor-pointer border-none bg-transparent text-left transition-colors"
            onClick={handleCopy}
            data-testid="copy-action"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
            </svg>
            Copy message
          </button>
          {onDelete && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface-hover cursor-pointer border-none bg-transparent text-left transition-colors"
              onClick={() => handleDelete(false)}
              data-testid="delete-for-me-action"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.trash} />
              </svg>
              Delete for me
            </button>
          )}
          {onDelete && (isGroup ? canDeleteAny : isMe) && (
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-critical-semantic hover:bg-critical-surface cursor-pointer border-none bg-transparent text-left transition-colors"
              onClick={() => handleDelete(true)}
              data-testid="delete-for-everyone-action"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.switchUser} />
              </svg>
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
