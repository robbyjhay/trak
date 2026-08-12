"use client";

import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";

export function IncomingCallOverlay() {
  const { incomingCallFrom, acceptCall, rejectCall } = useCall();
  const { userMap } = useTrak();

  if (!incomingCallFrom) return null;

  const caller = userMap[incomingCallFrom];
  if (!caller) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-[340px] overflow-hidden rounded-[20px] border border-line bg-card shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col items-center bg-linear-to-b from-aztec to-aztec-2 px-6 pt-8 pb-6 text-white">
          <div className="relative mb-4">
            <span className="absolute inset-0 animate-ping rounded-full bg-saffron/30" />
            <span
              className="absolute -inset-3 animate-ping rounded-full bg-saffron/20"
              style={{ animationDelay: "0.4s" }}
            />
            <div
              className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full font-display text-xl font-bold text-white"
              style={{ background: caller.color }}
            >
              {initials(caller.name)}
            </div>
          </div>
          <div className="text-[18px] font-bold">{caller.name}</div>
          <div className="mt-1 text-[12px] text-white/65">Incoming voice call</div>
          <div className="mt-1 text-[11px] text-white/45">{caller.designation || caller.username}</div>
        </div>

        <div className="flex items-center justify-center gap-8 px-6 py-7">
          <button
            type="button"
            onClick={rejectCall}
            className="flex h-[56px] w-[56px] cursor-pointer items-center justify-center rounded-full border-none bg-critical text-white shadow-[0_6px_16px_rgba(181,69,58,0.4)] transition-transform hover:scale-105 active:scale-95"
            aria-label="Decline call"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="rotate-[135deg]"
            >
              <path d={PATHS.phone} />
            </svg>
          </button>
          <button
            type="button"
            onClick={acceptCall}
            className="flex h-[56px] w-[56px] cursor-pointer items-center justify-center rounded-full border-none bg-[#34c759] text-white shadow-[0_6px_16px_rgba(52,199,89,0.4)] transition-transform hover:scale-105 active:scale-95"
            aria-label="Accept call"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d={PATHS.phone} />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
