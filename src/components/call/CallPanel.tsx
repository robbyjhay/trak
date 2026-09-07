"use client";

import { useState } from "react";
import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { formatDuration } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";

export function CallPanel({
  partner,
  onBack,
}: {
  partner: User;
  onBack?: () => void;
}) {
  const { activeCall, elapsedSec, endCall, toggleMute, isMuted, setSpeakerSinkId, speakerSupported } = useCall();
  const { recordCall, showToast } = useTrak();
  const [speakerOn, setSpeakerOn] = useState(false);

  const status = activeCall?.status ?? "ringing";
  const timer = formatDuration(elapsedSec);

  const handleEnd = () => {
    const dur = elapsedSec;
    endCall();
    if (dur > 0) {
      showToast("Call ended", `Call with ${partner.name} lasted ${timer}.`);
      void recordCall(partner.id, dur).catch(() => {});
    }
  };

  const handleMute = () => {
    toggleMute();
  };

  const handleSpeaker = async () => {
    if (!speakerSupported) return;
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      if (next) {
        await setSpeakerSinkId("");
      } else {
        await setSpeakerSinkId("");
      }
    } catch {
      // setSinkId is best-effort; ignore failures
    }
  };

  const isRinging = status === "ringing";
  const isConnected = status === "connected";

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-white/10 bg-[#0d1d1a] px-3 py-3 text-white sm:px-4"
      role="region"
      aria-label={`Voice call with ${partner.name}, ${isRinging ? "ringing" : timer}`}
      aria-live="polite"
    >
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_220px_at_75%_0%,rgba(246,198,66,0.09),transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_20%_100%,rgba(25,59,52,0.5),transparent_70%)]" aria-hidden />

      <div className="relative flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron md:hidden"
            aria-label="Back to conversations"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d={PATHS.chevronLeft} />
            </svg>
          </button>
        )}

        {/* Avatar with status ring */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          {isRinging && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-saffron/30" aria-hidden />
              <span className="absolute -inset-1.5 animate-ping rounded-full bg-saffron/15" style={{ animationDelay: "0.35s" }} aria-hidden />
            </>
          )}
          <UserAvatar
            photoUrl={partner.photoUrl}
            name={partner.name}
            color={partner.color}
            className="relative flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold text-white ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.22)]"
            imgClassName="h-full w-full rounded-full object-cover"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1d1a] ${isConnected ? "bg-emerald-500" : "bg-amber-400"} ${isRinging ? "animate-pulse" : ""}`}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[14.5px] font-bold leading-none tracking-tight text-white">{partner.name}</span>
            <span className="hidden shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 backdrop-blur sm:inline-flex">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"} ${isRinging ? "animate-pulse" : ""}`} aria-hidden />
              {isRinging ? (activeCall?.direction === "outgoing" ? "Calling" : "Ringing") : "Connected"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {isRinging ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" aria-hidden />
                {activeCall?.direction === "outgoing" ? "Calling…" : "Ringing…"}
                <span className="hidden text-white/35 sm:inline">· TRAK voice</span>
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron/15 bg-saffron/10 px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.08em] text-saffron">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-saffron" aria-hidden />
                  {timer}
                </span>
                <span className="hidden items-end gap-[2.5px] sm:flex" aria-hidden>
                  {[9, 14, 11, 16, 10].map((h, i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-saffron/70"
                      style={{
                        height: `${h}px`,
                        animation: `pulse 0.85s ease-in-out ${i * 0.09}s infinite`,
                      }}
                    />
                  ))}
                </span>
                <span className="hidden text-[11px] font-medium text-white/35 sm:inline">· HD</span>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleMute}
            aria-pressed={isMuted}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1d1a] sm:h-10 sm:w-10 ${
              isMuted ? "border-white bg-white text-aztec shadow-[0_6px_16px_rgba(255,255,255,0.12)]" : "border-white/14 bg-white/[0.07] text-white hover:bg-white/10"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMuted ? 2.4 : 2} aria-hidden>
              <path d={PATHS.mic} />
              {isMuted && <path d="M3 3l18 18" strokeLinecap="round" />}
            </svg>
          </button>
          <button
            type="button"
            onClick={handleSpeaker}
            disabled={!speakerSupported}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1d1a] disabled:cursor-not-allowed sm:h-10 sm:w-10 ${
              speakerOn ? "border-white bg-white text-aztec shadow-[0_6px_16px_rgba(255,255,255,0.12)]" : "border-white/14 bg-white/[0.07] text-white hover:bg-white/10"
            } ${!speakerSupported ? "opacity-40" : ""}`}
            aria-label={speakerOn ? "Speaker off" : "Speaker on"}
            title={!speakerSupported ? "Speaker control not supported by this browser" : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={speakerOn ? 2.4 : 2} aria-hidden>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              {speakerOn && <path d="M19 5a10 10 0 0 1 0 14" />}
            </svg>
          </button>
          <span aria-hidden className="mx-0.5 hidden h-7 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={handleEnd}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-critical text-white shadow-[0_8px_18px_rgba(181,69,58,0.42)] transition-all hover:bg-[#c24e42] hover:shadow-[0_10px_22px_rgba(181,69,58,0.48)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1d1a] sm:h-10 sm:w-10"
            aria-label="End call"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="rotate-[135deg]" aria-hidden>
              <path d={PATHS.phone} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
