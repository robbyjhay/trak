"use no memo";

import React, { useState, useRef, useEffect } from "react";
import { firstName, cn } from "@/lib/utils";
import { useCopy } from "@/hooks/useCopy";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { parseSegments, parseSegmentsWithLinks } from "@/lib/mention-utils";
import { scrollToMessage } from "@/lib/message-scroll";
import { PATHS } from "@/components/icons";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MessageAttachment, MessageMention, ReplyPreview, LinkPreview, AnnouncementReaction } from "@/lib/types";
import { LinkPreviewCard } from "./LinkPreviewCard";

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
  linkPreview,
  reactions,
  onReact,
  reactionSet = ["👍", "❤️", "😂", "👏", "🔥"],
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
  linkPreview?: LinkPreview | null;
  /** Announcement reactions — rendered as an inline emoji bar beneath the bubble. */
  reactions?: AnnouncementReaction[];
  /** Toggle a default reaction on this message. */
  onReact?: (emoji: string) => void;
  /** The 5 default reaction emojis, in display order. */
  reactionSet?: readonly string[];
}) {
  const isMe = fromId === me;
  const p = userMap[fromId];
  const replySender = replyTo ? userMap[replyTo.from] : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { copied: copySuccess, copy: doCopy } = useCopy({ duration: 1600 });
  const [bubbleCopied, setBubbleCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide inline More button after 3s on mobile tap
  useEffect(() => {
    if (!showActions) return;
    const t = setTimeout(() => setShowActions(false), 2800);
    return () => clearTimeout(t);
  }, [showActions]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

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
    setShowActions(false);
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }

  function openMenu(e: React.MouseEvent) {
    if (isDeleted) return;
    if (!onReply && !onDelete) return;
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  }

  function openMenuFromBubble(e: React.MouseEvent | React.TouchEvent) {
    // Position menu near the bubble center, clamped to viewport — avoids overflow-hidden clipping
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    openMenuAt(x, y);
  }

  function handleReply() {
    setMenuOpen(false);
    setShowActions(false);
    if (id && onReply) onReply(id);
  }

  async function handleCopy() {
    const ok = await doCopy(text || "");
    if (ok) {
      // Show inline success on the menu button + subtle bubble confirmation
      setBubbleCopied(true);
      setTimeout(() => setBubbleCopied(false), 1400);
      // Keep menu open briefly so user sees Copy → Copied transition, then close
      setTimeout(() => setMenuOpen(false), 950);
    } else {
      setMenuOpen(false);
    }
    setShowActions(false);
  }

  function handleDelete(forEveryone: boolean) {
    setMenuOpen(false);
    setShowActions(false);
    onDelete?.(forEveryone);
  }

  function handleBubbleClick(e: React.MouseEvent) {
    if (isDeleted) return;
    // Don't interfere with text selection
    const sel = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
    if (sel && sel.length > 0) return;
    // If user was dragging/swiping, don't treat as tap
    if (hasMovedRef.current || isDragging) return;
    // Desktop: double-click (detail === 2) opens menu — keeps existing desktop affordance
    if (e.detail === 2) {
      e.preventDefault();
      openMenu(e);
      return;
    }
    // Mobile: single tap shows inline More button, double-tap opens menu
    // Use a short timer to distinguish single vs double tap without blocking scroll
    const now = Date.now();
    const isDouble = now - lastTapRef.current < 300;
    lastTapRef.current = now;
    if (isDouble) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      // Double-tap → open menu at bubble center
      openMenuFromBubble(e);
      return;
    }
    // Single tap: show More button for 2.8s (desktop hover already shows it, this is for mobile)
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = setTimeout(() => {
      // If not already showing menu, show inline actions
      if (!menuOpen) setShowActions(true);
    }, 180);
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
      // Any meaningful move cancels single-tap More button timer
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
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

  const segments = parseSegmentsWithLinks(text, isDeleted ? undefined : mentions);

  // Drag progress for icon opacity/scale
  const dragProgress = Math.min(offsetX / THRESHOLD, 1);

  return (
    <div
      className={cn(
        "flex max-w-[75%] min-w-0 gap-2.5 group relative w-fit items-end",
        isMe ? "flex-row-reverse" : "",
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
            <UserAvatar
              photoUrl={p?.photoUrl}
              name={p?.name || "?"}
              color={p?.color || "#888"}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[11px] font-bold text-white shadow-sm"
              imgClassName="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="w-[30px] h-[30px]" />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className="flex flex-col min-w-0 max-w-full relative max-w-[280px]"
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
        
        {/* Copied confirmation anchored to bubble — absolute, no layout shift */}
        <AnimatePresence>
          {bubbleCopied && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "pointer-events-none absolute z-10 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-toast flex items-center gap-1",
                isMe ? "right-0 -top-7 bg-tooltip text-white" : "left-0 -top-7 bg-tooltip text-white"
              )}
              role="status"
              aria-live="polite"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            "relative px-3.5 py-2.5 shadow-sm min-w-[60px] transition-all duration-150",
            isMe
              ? "bg-primary text-primary-foreground"
              : "bg-surface text-foreground border border-border/40",
            isMe ? "rounded-l-[18px] rounded-tr-[18px]" : "rounded-r-[18px] rounded-tl-[18px]",
            isMe && isLastInGroup ? "rounded-br-sm" : isMe && "rounded-br-[18px]",
            !isMe && isLastInGroup ? "rounded-bl-sm" : !isMe && "rounded-bl-[18px]",
            !isDeleted && "cursor-pointer",
            "select-text",
            bubbleCopied && (isMe ? "ring-1 ring-white/30" : "ring-1 ring-success/30")
          )}
          style={{ touchAction: "pan-y" } as any}
          onContextMenu={openMenu}
          onClick={handleBubbleClick}
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
                if (seg.type === "link") {
                  return (
                    <a
                      key={`link-${i}`}
                      href={seg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline no-underline underline-offset-2 hover:underline font-medium break-words overflow-wrap-anywhere",
                        isMe
                          ? "text-primary-foreground underline decoration-primary-foreground/40"
                          : "text-primary decoration-primary/40"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {seg.value}
                    </a>
                  );
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
                    onPointerUp={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerCancel={(e) => {
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

          {reactions && reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" data-testid={`reactions-${id}`}>
              {reactionSet.map((emoji) => {
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
                      onReact?.(emoji);
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
          )}

          {!isDeleted && linkPreview && (
              <div className="mt-0.5">
                <LinkPreviewCard preview={linkPreview} me={isMe} />
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

        {/* Inline More button — obvious affordance: desktop hover, mobile single-tap */}
        {!isDeleted && (onReply || onDelete) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openMenuFromBubble(e);
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full bg-surface border border-border shadow-sm text-foreground-secondary hover:bg-surface-hover hover:text-foreground active:scale-95 transition-all duration-150 touch-manipulation",
              "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
              (showActions || menuOpen) && "opacity-100 pointer-events-auto",
              "focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-primary"
            )}
            aria-label="More options"
            data-testid="more-options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <circle cx="12" cy="12" r="1" />
              <circle cx="19.5" cy="12" r="1" />
              <circle cx="4.5" cy="12" r="1" />
            </svg>
          </button>
        )}
      </div>

      {/* Context Menu — Reply, Copy, Delete for me/everyone */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 2 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed z-[200] min-w-[180px] rounded-[14px] border border-border bg-surface shadow-xl py-1.5"
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
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium cursor-pointer border-none bg-transparent text-left transition-colors",
                copySuccess ? "text-success bg-success-surface" : "text-foreground hover:bg-surface-hover"
              )}
              onClick={handleCopy}
              data-testid={copySuccess ? "copy-success" : "copy-action"}
              aria-live="polite"
            >
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                <AnimatePresence mode="wait" initial={false}>
                  {copySuccess ? (
                    <motion.svg
                      key="check"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute text-success"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </motion.svg>
                  ) : (
                    <motion.svg
                      key="copy"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="absolute"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copySuccess ? "copied" : "copy"}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                >
                  {copySuccess ? "Copied" : "Copy message"}
                </motion.span>
              </AnimatePresence>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
