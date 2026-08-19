"use client";

import { useState } from "react";
import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { formatDuration, initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import type { User } from "@/lib/types";

export function CallPanel({
  partner,
  onBack,
}: {
  partner: User;
  onBack?: () => void;
}) {
  const { activeCall, elapsedSec, endCall } = useCall();
  const { recordCall, showToast } = useTrak();
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

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

  return (
    <div className="relative overflow-hidden border-b border-border bg-linear-to-r from-aztec to-aztec-2 px-[22px] py-3.5 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(246,198,66,0.18),transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors md:hidden"
            aria-label="Back to conversations"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.chevronLeft} />
            </svg>
          </button>
        )}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          {status === "ringing" && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              <span
                className="absolute -inset-2 animate-ping rounded-full bg-primary/25"
                style={{ animationDelay: "0.3s" }}
              />
            </>
          )}
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-full font-display text-xs font-bold text-white"
            style={{ background: partner.color }}
          >
            {initials(partner.name)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold text-white">{partner.name}</div>
          <div className="flex items-center gap-2">
            {status === "ringing" ? (
              <span className="text-[11px] text-white/65">
                {activeCall?.direction === "outgoing" ? "Calling" : "Ringing"}
                <span className="animate-pulse">...</span>
              </span>
            ) : (
              <>
                <span className="font-mono text-[11.5px] font-bold tracking-widest text-primary">
                  {timer}
                </span>
                <span className="flex items-end gap-[3px]">
                  {[8, 14, 10, 16, 12].map((h, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-primary/70"
                      style={{
                        height: `${h}px`,
                        animation: `pulse 0.9s ease-in-out ${i * 0.12}s infinite`,
                      }}
                    />
                  ))}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors ${
              muted
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-white/15 bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={muted ? 2.4 : 2}>
              <path d={PATHS.mic} />
              {muted && <path d="M3 3l18 18" />}
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSpeaker((v) => !v)}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors ${
              speaker
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-white/15 bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={speaker ? "Speaker off" : "Speaker on"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={speaker ? 2.4 : 2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              {speaker && <path d="M19 5a10 10 0 0 1 0 14" />}
            </svg>
          </button>
          <button
            type="button"
            onClick={handleEnd}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-critical-semantic text-critical-foreground shadow-[0_8px_18px_rgba(181,69,58,0.45)] transition-transform hover:scale-105 active:scale-95"
            aria-label="End call"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="rotate-[135deg]"
            >
              <path d={PATHS.phone} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
