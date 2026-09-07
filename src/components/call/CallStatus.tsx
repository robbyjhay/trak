"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDuration } from "@/lib/utils";
import { PATHS } from "@/components/icons";

export type CallDisplayState =
  | { kind: "calling"; label: string; sub?: string; tone: "amber" }
  | { kind: "ringing"; label: string; sub?: string; tone: "amber" }
  | { kind: "connecting"; label: string; sub?: string; tone: "neutral" }
  | { kind: "connected"; label: string; sub?: string; tone: "success" }
  | { kind: "muted"; label: string; sub?: string; tone: "amber" }
  | { kind: "reconnecting"; label: string; sub?: string; tone: "warning" }
  | { kind: "failed"; label: string; sub?: string; tone: "critical" }
  | { kind: "ended"; label: string; sub?: string; tone: "neutral" };

export function deriveCallState(opts: {
  status: "ringing" | "connected" | "ended";
  direction: "outgoing" | "incoming";
  elapsedSec: number;
  isMuted: boolean;
  signalingConnected: boolean;
  presenceSynced: boolean;
}): CallDisplayState {
  const { status, direction, elapsedSec, isMuted, signalingConnected } = opts;

  if (!signalingConnected) {
    return { kind: "reconnecting", label: "Reconnecting…", sub: "Checking connection", tone: "warning" };
  }
  if (status === "ringing") {
    if (direction === "outgoing") {
      return { kind: "calling", label: "Calling…", sub: "Ringing", tone: "amber" };
    }
    return { kind: "ringing", label: "Ringing…", sub: "Incoming voice call", tone: "amber" };
  }
  if (status === "connected") {
    if (isMuted) {
      return {
        kind: "muted",
        label: formatDuration(elapsedSec),
        sub: "Muted · Tap to unmute",
        tone: "amber",
      };
    }
    return {
      kind: "connected",
      label: formatDuration(elapsedSec),
      sub: "Connected · TRAK voice",
      tone: "success",
    };
  }
  return { kind: "ended", label: "Call ended", tone: "neutral" };
}

export function CallStatusLine({
  state,
  compact = false,
}: {
  state: CallDisplayState;
  compact?: boolean;
}) {
  const shouldReduce = useReducedMotion();

  const dotColor =
    state.tone === "success"
      ? "bg-emerald-500"
      : state.tone === "amber" || state.tone === "warning"
        ? "bg-amber-400"
        : state.tone === "critical"
          ? "bg-critical"
          : "bg-white/60";

  const labelClass =
    state.kind === "connected" || state.kind === "muted"
      ? "font-mono font-bold tracking-[0.08em] text-saffron"
      : "font-sans font-semibold tracking-wide text-white/85";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" aria-live="polite" aria-atomic="true">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor} ${state.kind === "calling" || state.kind === "ringing" ? "animate-pulse" : ""}`} />
        <span className="text-[11px] font-semibold tracking-wide text-white/80">{state.label}</span>
        {state.sub && <span className="hidden sm:inline text-[11px] text-white/45">· {state.sub}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2" aria-live="polite" aria-atomic="true">
      {/* primary label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.label}
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`text-center text-[15px] md:text-[16px] ${labelClass}`}
        >
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className={`h-2 w-2 rounded-full ${dotColor} ${state.kind === "calling" || state.kind === "ringing" ? "animate-pulse" : ""}`} />
            {state.label}
            {(state.kind === "connected" || state.kind === "muted") && (
              <WaveBars active={!shouldReduce} muted={state.kind === "muted"} />
            )}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* sub label */}
      {state.sub && (
        <AnimatePresence mode="wait">
          <motion.div
            key={state.sub}
            initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white/50"
          >
            {state.sub}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function WaveBars({ active, muted }: { active: boolean; muted?: boolean }) {
  const bars = [9, 14, 11, 16, 10];
  if (muted) {
    return (
      <span className="ml-1 inline-flex items-end gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} className="w-[3px] rounded-full bg-white/20" style={{ height: `${h}px`, opacity: 0.5 }} />
        ))}
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-end gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-saffron/85"
          style={{ height: `${h}px` }}
          animate={
            active
              ? { scaleY: [0.7, 1.25, 0.85, 1.15, 0.9, 1], opacity: [0.7, 1, 0.85, 1, 0.9, 1] }
              : undefined
          }
          transition={
            active
              ? { duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }
              : undefined
          }
        />
      ))}
    </span>
  );
}

export function CallLiveRegion({ state }: { state: CallDisplayState }) {
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {state.label} {state.sub ? `, ${state.sub}` : ""}
    </p>
  );
}
