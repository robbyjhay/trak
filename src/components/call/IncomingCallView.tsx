"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CallAvatar } from "./CallAvatar";
import { ChromeInfernoAura } from "./ChromeInfernoAura";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";

type IncomingCallViewProps = {
  caller: User;
  onAccept: () => void;
  onDecline: () => void;
  // optional accepting/declining transient UI
  busy?: boolean;
};

export function IncomingCallView({ caller, onAccept, onDecline, busy }: IncomingCallViewProps) {
  const shouldReduce = useReducedMotion();
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus accept on open, Esc to decline
  useEffect(() => {
    const t = setTimeout(() => acceptRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDecline();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDecline]);

  // Prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="fixed inset-0 z-[95] flex flex-col overflow-hidden text-white"
      style={{ backgroundColor: "#100e0b" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      aria-describedby="incoming-call-desc"
    >
      {/* Chrome Inferno Aura — blend modes composite against #100e0b */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <ChromeInfernoAura />
      </div>

      {/* Top */}
      <div className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-6 pt-[max(28px,env(safe-area-inset-top))] text-center">
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Incoming call</span>
          <span className="h-3 w-px bg-white/10" aria-hidden />
          <span className="text-[11px] font-medium tracking-wide text-white/50">TRAK voice</span>
        </motion.div>
        <p id="incoming-call-desc" className="text-[12px] font-medium tracking-wide text-white/40">
          End-to-end encrypted · Secure connection
        </p>
      </div>

      {/* Center */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
        <motion.div
          initial={shouldReduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.42, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <CallAvatar
            photoUrl={caller.photoUrl}
            name={caller.name}
            color={caller.color}
            size="xl"
            ringing
          />

          <h1 id="incoming-call-title" className="mt-7 text-center font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-white md:mt-8 md:text-[34px]">
            {caller.name}
          </h1>
          <p className="mt-2 text-center text-[13.5px] font-medium text-white/60">
            {caller.designation || "Unit member"}
            <span className="mx-1.5 text-white/20">·</span>
            <span className="font-mono text-[11.5px] text-white/40">{caller.username}</span>
          </p>

          {/* ringing indicator capsule */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-saffron" aria-hidden />
            <span className="text-[12px] font-semibold tracking-wide text-white/85">Ringing…</span>
            <span className="hidden text-[12px] font-medium text-white/35 md:inline">· Tap Accept to answer</span>
          </div>
        </motion.div>

        {/* subtle helper for accessibility */}
        <p className="sr-only">Incoming voice call from {caller.name}. Press Accept to answer or Decline to reject.</p>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex shrink-0 flex-col items-center gap-5 px-6 pb-[max(32px,env(safe-area-inset-bottom))] pt-2">
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.18, ease: "easeOut" }}
          className="flex w-full max-w-[380px] items-end justify-center gap-8 md:gap-10"
        >
          {/* Decline */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onDecline}
              disabled={!!busy}
              aria-label={`Decline call from ${caller.name}`}
              className="group flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white backdrop-blur-md transition-all hover:bg-white/[0.12] hover:border-white/15 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b] disabled:opacity-60 md:h-[72px] md:w-[72px]"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-critical shadow-[0_10px_24px_rgba(181,69,58,0.5)] transition-transform group-active:scale-95 md:h-[56px] md:w-[56px]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" className="rotate-[135deg]" aria-hidden>
                  <path d={PATHS.phone} />
                </svg>
              </span>
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-3">
            <button
              ref={acceptRef}
              type="button"
              onClick={onAccept}
              disabled={!!busy}
              aria-label={`Accept call from ${caller.name}`}
              className="group flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full border border-saffron/20 bg-saffron/[0.12] backdrop-blur-md transition-all hover:bg-saffron/20 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b] disabled:opacity-60 md:h-[72px] md:w-[72px]"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-saffron text-aztec shadow-[0_10px_24px_rgba(246,198,66,0.42)] transition-transform group-active:scale-95 md:h-[56px] md:w-[56px]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d={PATHS.phone} />
                </svg>
              </span>
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-saffron">Accept</span>
          </div>
        </motion.div>

        <p className="max-w-[32ch] text-center text-[11px] font-medium leading-relaxed tracking-wide text-white/30">
          This call will use your microphone. You can mute at any time.
        </p>
      </div>
    </motion.div>
  );
}
