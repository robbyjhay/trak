"use client";

import { PATHS } from "@/components/icons";
import { cn } from "@/lib/utils";

type CallControlsProps = {
  isMuted: boolean;
  onMute: () => void;
  speakerOn: boolean;
  speakerSupported: boolean;
  onSpeaker: () => void;
  onEnd: () => void;
  onMinimize?: () => void;
  isExpanded?: boolean;
  size?: "default" | "compact";
  showLabels?: boolean;
};

function ControlButton({
  active,
  disabled,
  label,
  ariaLabel,
  onClick,
  children,
  size = "default",
}: {
  active?: boolean;
  disabled?: boolean;
  label?: string;
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  size?: "default" | "compact";
}) {
  const dim = size === "compact" ? "h-9 w-9" : "h-[56px] w-[56px] md:h-[60px] md:w-[60px]";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={active}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b] disabled:cursor-not-allowed",
          dim,
          active
            ? "border-white bg-white text-aztec shadow-[0_8px_22px_rgba(255,255,255,0.16)]"
            : "border-white/14 bg-white/[0.08] text-white backdrop-blur-md hover:border-white/22 hover:bg-white/[0.12]",
          disabled && "opacity-40",
        )}
      >
        {children}
      </button>
      {label && (
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60 md:block">
          {label}
        </span>
      )}
    </div>
  );
}

export function CallControls({
  isMuted,
  onMute,
  speakerOn,
  speakerSupported,
  onSpeaker,
  onEnd,
  onMinimize,
  isExpanded,
  size = "default",
  showLabels = false,
}: CallControlsProps) {
  const isCompact = size === "compact";

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        isCompact ? "gap-2" : "gap-3 md:gap-4",
      )}
      role="toolbar"
      aria-label="Call controls"
    >
      {/* Mute */}
      <ControlButton
        active={isMuted}
        ariaLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        label={showLabels ? (isMuted ? "Unmute" : "Mute") : undefined}
        onClick={onMute}
        size={size}
      >
        <svg
          width={isCompact ? 16 : 18}
          height={isCompact ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={isMuted ? 2.4 : 2}
          aria-hidden
        >
          <path d={PATHS.mic} />
          {isMuted && <path d="M3 3l18 18" strokeLinecap="round" />}
        </svg>
      </ControlButton>

      {/* Speaker */}
      <ControlButton
        active={speakerOn}
        disabled={!speakerSupported}
        ariaLabel={speakerOn ? "Turn speaker off" : "Turn speaker on"}
        label={showLabels ? "Speaker" : undefined}
        onClick={onSpeaker}
        size={size}
      >
        <svg
          width={isCompact ? 16 : 18}
          height={isCompact ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={speakerOn ? 2.4 : 2}
          aria-hidden
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {speakerOn && <path d="M19 5a10 10 0 0 1 0 14" />}
        </svg>
      </ControlButton>

      {!isCompact && (
        <span aria-hidden className="mx-1 hidden h-9 w-px shrink-0 bg-white/10 md:block" />
      )}
      {isCompact && <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-white/10" />}

      {/* End call — always distinct, larger, separated */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onEnd}
          aria-label="End call"
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-full border-none bg-critical text-white shadow-[0_10px_24px_rgba(181,69,58,0.45)] transition-all hover:bg-[#c24a3e] hover:shadow-[0_12px_28px_rgba(181,69,58,0.5)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b]",
            isCompact ? "h-9 w-9" : "h-[56px] w-[56px] md:h-[62px] md:w-[62px]",
          )}
        >
          <svg
            width={isCompact ? 15 : 19}
            height={isCompact ? 15 : 19}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="rotate-[135deg]"
            aria-hidden
          >
            <path d={PATHS.phone} />
          </svg>
        </button>
        {showLabels && !isCompact && (
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60 md:block">
            End
          </span>
        )}
      </div>

      {/* Minimize / Expand — only when provided */}
      {onMinimize && (
        <>
          <span aria-hidden className={cn("h-9 w-px shrink-0 bg-white/10", isCompact ? "h-6" : "")} />
          <ControlButton
            ariaLabel={isExpanded ? "Minimize call" : "Expand call"}
            label={showLabels ? (isExpanded ? "Minimize" : "Expand") : undefined}
            onClick={onMinimize}
            size={size}
          >
            {isExpanded ? (
              <svg width={isCompact ? 14 : 16} height={isCompact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M4 14h7v7M20 10V3h-7M20 14v7h-7M4 10V3h7" />
                {/* chevron down minimize */}
                <path d="M12 8l-2 2 2 2M12 16l2-2-2-2" className="hidden" />
              </svg>
            ) : (
              <svg width={isCompact ? 14 : 16} height={isCompact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
            {/* fallback icons if above paths not ideal - use chevron */}
            <span className="sr-only">{isExpanded ? "Minimize" : "Expand"}</span>
          </ControlButton>
        </>
      )}
    </div>
  );
}

/* Compact bar controls variant — tighter, pill */
export function CompactCallControls({
  isMuted,
  onMute,
  speakerOn,
  speakerSupported,
  onSpeaker,
  onEnd,
  onExpand,
}: {
  isMuted: boolean;
  onMute: () => void;
  speakerOn: boolean;
  speakerSupported: boolean;
  onSpeaker: () => void;
  onEnd: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="toolbar" aria-label="Call controls">
      <button
        type="button"
        onClick={onMute}
        aria-pressed={isMuted}
        aria-label={isMuted ? "Unmute" : "Mute"}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron",
          isMuted ? "border-white bg-white text-aztec" : "border-white/15 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMuted ? 2.3 : 1.9} aria-hidden>
          <path d={PATHS.mic} />
          {isMuted && <path d="M3 3l18 18" />}
        </svg>
      </button>
      <button
        type="button"
        onClick={onSpeaker}
        disabled={!speakerSupported}
        aria-pressed={speakerOn}
        aria-label={speakerOn ? "Speaker off" : "Speaker on"}
        className={cn(
          "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron disabled:opacity-40",
          speakerOn ? "border-white bg-white text-aztec" : "border-white/15 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={speakerOn ? 2.3 : 1.9} aria-hidden>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {speakerOn && <path d="M19 5a10 10 0 0 1 0 14" />}
        </svg>
      </button>
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand call"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onEnd}
        aria-label="End call"
        className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-critical text-white hover:bg-[#c24a3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rotate-[135deg]" aria-hidden>
          <path d={PATHS.phone} />
        </svg>
      </button>
    </div>
  );
}
