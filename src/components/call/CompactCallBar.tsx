"use client";

import { motion, useReducedMotion } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDuration } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";

type CompactCallBarProps = {
  partner: User;
  status: "ringing" | "connected";
  direction: "outgoing" | "incoming";
  elapsedSec: number;
  isMuted: boolean;
  speakerOn: boolean;
  speakerSupported: boolean;
  onMute: () => void;
  onSpeaker: () => void;
  onEnd: () => void;
  onExpand: () => void;
  signalingConnected: boolean;
};

export function CompactCallBar({
  partner,
  status,
  direction,
  elapsedSec,
  isMuted,
  speakerOn,
  speakerSupported,
  onMute,
  onSpeaker,
  onEnd,
  onExpand,
  signalingConnected,
}: CompactCallBarProps) {
  const shouldReduce = useReducedMotion();

  const statusLabel =
    status === "ringing"
      ? direction === "outgoing"
        ? "Calling…"
        : "Ringing…"
      : formatDuration(elapsedSec);

  const subLabel =
    !signalingConnected
      ? "Reconnecting…"
      : status === "ringing"
        ? "Ringing"
        : isMuted
          ? "Muted"
          : "Connected";

  return (
    <>
      {/* Desktop: full-width bar below Topbar — integrated into shell */}
      <motion.div
        initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="hidden w-full shrink-0 md:block"
        role="region"
        aria-label={`Active call with ${partner.name}, ${statusLabel}`}
      >
        <div className="flex w-full items-center justify-between gap-3 border-b border-white/10 bg-[#0d1d1a] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.22)] sm:px-4 md:px-6">
        {/* Left: identity */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand call to fullscreen"
            className="flex shrink-0 items-center gap-3 rounded-full p-1 pr-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              {status === "ringing" && !shouldReduce && (
                <span className="absolute inset-0 animate-ping rounded-full bg-saffron/20" aria-hidden />
              )}
              <UserAvatar
                photoUrl={partner.photoUrl}
                name={partner.name}
                color={partner.color}
                className="relative flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold text-white ring-1 ring-white/10"
                imgClassName="h-full w-full rounded-full object-cover"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1d1a] ${status === "connected" ? "bg-emerald-500" : "bg-amber-400"} ${status === "ringing" ? "animate-pulse" : ""}`}
                aria-hidden
              />
            </span>
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-[13px] font-bold leading-none tracking-tight text-white">{partner.name}</span>
              <span className="flex items-center gap-1.5 truncate text-[11px] font-medium tracking-wide text-white/60">
                <span className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-amber-400"} ${status === "ringing" ? "animate-pulse" : ""}`} aria-hidden />
                {subLabel}
              </span>
            </span>
            {/* on very small screens show just name */}
            <span className="truncate text-[13px] font-bold text-white sm:hidden">{partner.name}</span>
          </button>

          {/* Timer / status - visible md+ as pill */}
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 backdrop-blur md:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-saffron"} ${status === "ringing" ? "animate-pulse" : ""}`} aria-hidden />
            <span className="font-mono text-[11.5px] font-bold tracking-[0.08em] text-saffron">{statusLabel}</span>
            <span className="hidden text-[11px] font-medium text-white/45 lg:inline">· TRAK voice</span>
          </span>

          {/* mobile timer */}
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold tracking-wide text-saffron md:hidden">
            <span className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-saffron"} ${status === "ringing" ? "animate-pulse" : ""}`} aria-hidden />
            {statusLabel}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron sm:h-9 sm:w-9 ${
              isMuted
                ? "border-white bg-white text-aztec"
                : "border-white/14 bg-white/[0.07] text-white hover:bg-white/10"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMuted ? 2.3 : 2} aria-hidden>
              <path d={PATHS.mic} />
              {isMuted && <path d="M3 3l18 18" strokeLinecap="round" />}
            </svg>
          </button>

          <button
            type="button"
            onClick={onSpeaker}
            disabled={!speakerSupported}
            aria-pressed={speakerOn}
            aria-label={speakerOn ? "Speaker off" : "Speaker on"}
            className={`hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron disabled:opacity-40 sm:flex ${
              speakerOn
                ? "border-white bg-white text-aztec"
                : "border-white/14 bg-white/[0.07] text-white hover:bg-white/10"
            }`}
            title={!speakerSupported ? "Speaker not supported" : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={speakerOn ? 2.3 : 2} aria-hidden>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              {speakerOn && <path d="M19 5a10 10 0 0 1 0 14" />}
            </svg>
          </button>

          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand call"
            className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/[0.07] text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron sm:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>

          <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" />

          <button
            type="button"
            onClick={onEnd}
            aria-label="End call"
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-critical px-3 text-white shadow-[0_6px_16px_rgba(181,69,58,0.38)] transition-colors hover:bg-[#c24e42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-9 sm:px-3.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rotate-[135deg]" aria-hidden>
              <path d={PATHS.phone} />
            </svg>
            <span className="hidden text-[12px] font-bold tracking-wide sm:inline">End</span>
          </button>
        </div>
      </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Active call with {partner.name}, {statusLabel} {subLabel}
        </p>
      </motion.div>

      {/* Mobile: floating capsule above MobileNav — thumb-friendly */}
      <motion.div
        initial={shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="fixed bottom-[calc(76px+12px+env(safe-area-inset-bottom))] left-3 right-3 z-30 flex items-center justify-between gap-2 rounded-full border border-white/10 bg-[#0d1d1a]/95 px-2 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl md:hidden"
        role="region"
        aria-label={`Active call with ${partner.name}, ${statusLabel}`}
      >
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand call"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            {status === "ringing" && !shouldReduce && <span className="absolute inset-0 animate-ping rounded-full bg-saffron/20" aria-hidden />}
            <UserAvatar
              photoUrl={partner.photoUrl}
              name={partner.name}
              color={partner.color}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/10"
              imgClassName="h-full w-full rounded-full object-cover"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold leading-none tracking-tight text-white">{partner.name}</span>
            <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-white/60">
              <span className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-amber-400"} ${status === "ringing" ? "animate-pulse" : ""}`} aria-hidden />
              {subLabel} · <span className="font-mono font-bold tracking-wide text-saffron">{statusLabel}</span>
            </span>
          </span>
        </button>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron ${isMuted ? "border-white bg-white text-aztec" : "border-white/14 bg-white/10 text-white"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMuted ? 2.3 : 2} aria-hidden>
              <path d={PATHS.mic} />
              {isMuted && <path d="M3 3l18 18" />}
            </svg>
          </button>
          <button
            type="button"
            onClick={onEnd}
            aria-label="End call"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-critical text-white shadow-[0_6px_14px_rgba(181,69,58,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rotate-[135deg]" aria-hidden>
              <path d={PATHS.phone} />
            </svg>
          </button>
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand call"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </span>
      </motion.div>
    </>
  );
}

/* Floating capsule variant — used as topbar-integrated pill on desktop when you don't want full-width bar.
   Keep for alternative layout; not used by default but exported for design flexibility. */
export function CompactCallPill(props: CompactCallBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      className="hidden items-center gap-3 rounded-full border border-white/10 bg-[#0d1d1a]/90 px-2 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl md:flex"
      role="region"
      aria-label={`Active call with ${props.partner.name}`}
    >
      <span className="flex items-center gap-2">
        <UserAvatar
          photoUrl={props.partner.photoUrl}
          name={props.partner.name}
          color={props.partner.color}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          imgClassName="h-full w-full rounded-full object-cover"
        />
        <span className="flex flex-col">
          <span className="text-[12.5px] font-bold leading-none tracking-tight text-white">{props.partner.name}</span>
          <span className="font-mono text-[11px] font-bold tracking-wide text-saffron">{props.status === "ringing" ? "Calling…" : formatDuration(props.elapsedSec)}</span>
        </span>
      </span>
      <span className="h-6 w-px bg-white/10" aria-hidden />
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={props.onMute}
          aria-pressed={props.isMuted}
          aria-label={props.isMuted ? "Unmute" : "Mute"}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border ${props.isMuted ? "border-white bg-white text-aztec" : "border-white/15 bg-white/10 text-white"} `}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d={PATHS.mic} />
            {props.isMuted && <path d="M3 3l18 18" />}
          </svg>
        </button>
        <button
          type="button"
          onClick={props.onExpand}
          aria-label="Expand call"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
        <button type="button" onClick={props.onEnd} aria-label="End call" className="ml-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-critical text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rotate-[135deg]" aria-hidden>
            <path d={PATHS.phone} />
          </svg>
        </button>
      </span>
    </motion.div>
  );
}
