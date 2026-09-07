"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CallAvatar } from "./CallAvatar";
import { CallControls } from "./CallControls";
import { CallStatusLine, deriveCallState } from "./CallStatus";
import { ChromeInfernoAura } from "./ChromeInfernoAura";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";

type ActiveCallViewProps = {
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
  onMinimize?: () => void;
  signalingConnected: boolean;
  presenceSynced: boolean;
};

export function ActiveCallView({
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
  onMinimize,
  signalingConnected,
  presenceSynced,
}: ActiveCallViewProps) {
  const shouldReduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Derive display state
  const display = deriveCallState({
    status,
    direction,
    elapsedSec,
    isMuted,
    signalingConnected,
    presenceSynced,
  });

  // Keyboard shortcuts: m = mute, Escape = minimize/end? minimize if provided else end
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) {
        // avoid typing in inputs
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        onMute();
      }
      if (e.key === "Escape" && onMinimize) {
        e.preventDefault();
        onMinimize();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMute, onMinimize]);

  return (
    <motion.div
      initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden text-white"
      style={{ backgroundColor: "#100e0b" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Voice call with ${partner.name}, ${display.label}`}
    >
      {/* Chrome Inferno Aura — blend modes composite against #100e0b wrapper */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <ChromeInfernoAura />
      </div>

      {/* Top chrome */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] md:px-8 md:pt-[max(24px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {onMinimize ? (
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize call"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white backdrop-blur-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            <span className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d={PATHS.phone} />
              </svg>
            </span>
          )}
          <div className="hidden flex-col sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">TRAK voice</span>
            <span className="text-[12px] font-medium text-white/60">End-to-end encrypted</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/70 backdrop-blur md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" aria-hidden />
            Secure call
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-white/60 backdrop-blur">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
            {isMuted ? "Muted" : "Live"}
          </span>
        </div>
      </div>

      {/* Center composition */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-6 md:gap-8">
        {/* Avatar block */}
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut", delay: 0.08 }}
          className="flex flex-col items-center"
        >
          <CallAvatar
            photoUrl={partner.photoUrl}
            name={partner.name}
            color={partner.color}
            size="xl"
            ringing={status === "ringing"}
            connected={status === "connected"}
            muted={isMuted}
          />

          {/* Name + role */}
          <div className="mt-7 flex flex-col items-center text-center md:mt-8">
            <h1 className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-white md:text-[34px]">
              {partner.name}
            </h1>
            <p className="mt-2 max-w-[28ch] text-[13px] font-medium leading-snug text-white/55 md:text-[13.5px]">
              {partner.designation ? (
                <>
                  {partner.designation}
                  <span className="mx-1.5 text-white/20">·</span>
                  <span className="font-mono text-[11.5px] tracking-wide text-white/35">{partner.username}</span>
                </>
              ) : (
                <span className="font-mono text-[11.5px] tracking-wide text-white/35">{partner.username}</span>
              )}
            </p>
          </div>

          {/* Status capsule */}
          <div className="mt-5 md:mt-6">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md">
              <CallStatusLine state={display} />
            </div>
          </div>

          {/* direction hint */}
          <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">
            {direction === "outgoing" ? "You started this call" : "Incoming call answered"}
          </p>
        </motion.div>

        {/* Visualizer when connected & not muted */}
        <AnimatePresence>
          {status === "connected" && !isMuted && !shouldReduce && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-1.5"
              aria-hidden
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Voice</span>
              <span className="flex items-end gap-[3px]">
                {[1, 2, 3, 4, 5, 6, 5, 4].map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full bg-white/35"
                    style={{ height: `${8 + (i % 3) * 5}px` }}
                    animate={{ scaleY: [0.7, 1.35, 0.9, 1.2, 0.85] }}
                    transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom dock */}
      <div className="relative z-10 flex shrink-0 flex-col items-center gap-4 px-4 pb-[max(20px,env(safe-area-inset-bottom))] md:px-8 md:pb-[max(28px,env(safe-area-inset-bottom))]">
        {/* control surface: glass pill */}
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
          className="flex w-full max-w-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.07] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-6"
        >
          <CallControls
            isMuted={isMuted}
            onMute={onMute}
            speakerOn={speakerOn}
            speakerSupported={speakerSupported}
            onSpeaker={onSpeaker}
            onEnd={onEnd}
            onMinimize={onMinimize}
            isExpanded={true}
            showLabels
          />
        </motion.div>

        <p className="hidden text-center text-[11px] font-medium tracking-wide text-white/30 md:block">
          Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">M</kbd> to mute · <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">Esc</kbd> to minimize
        </p>
        <p className="text-center text-[11px] font-medium tracking-wide text-white/25 md:hidden">
          Tap minimize to keep talking while you browse
        </p>
      </div>

      {/* Screen reader live region */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status === "ringing"
          ? direction === "outgoing"
            ? `Calling ${partner.name}`
            : `Incoming call from ${partner.name}`
          : `Connected to ${partner.name}, ${elapsedSec} seconds`}
      </p>
    </motion.div>
  );
}
