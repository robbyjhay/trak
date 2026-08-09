"use client";

import { useEffect, useState } from "react";
import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";

const RING_MS = 2600;

export function CallScreen() {
  const { activeCall } = useCall();
  if (!activeCall) return null;
  return <CallSession key={activeCall.startedAt} />;
}

function CallSession() {
  const { activeCall, endCall } = useCall();
  const { showToast } = useTrak();

  const [phase, setPhase] = useState<"ringing" | "connected">("ringing");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypad, setKeypad] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("connected"), RING_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endCall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [endCall]);

  const partner = activeCall!.partner;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timer = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const handleEnd = () => {
    endCall();
    showToast("Call ended", `You ended the call with ${partner.name}.`);
  };

  return (
    <div
      className="fixed inset-0 z-[300] bg-aztec text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Call in progress with ${partner.name}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(246,198,66,0.14),transparent_58%)]" />
      <div className="relative flex h-full flex-col items-center px-6 pt-9 pb-9">
        <div className="text-[10.5px] font-bold tracking-[0.24em] text-paper/50 uppercase">
          Trak Call
        </div>

        <div className="mt-auto flex flex-col items-center text-center">
          <div className="relative mb-7 flex h-32 w-32 items-center justify-center">
            {phase === "ringing" && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-saffron/25" />
                <span
                  className="absolute inset-2.5 animate-ping rounded-full bg-saffron/20"
                  style={{ animationDelay: "0.4s" }}
                />
              </>
            )}
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full font-display text-[40px] font-bold text-white shadow-toast"
              style={{ background: partner.color }}
            >
              {initials(partner.name)}
            </div>
          </div>

          <h2 className="m-0 max-w-[300px] truncate font-display text-[26px] font-semibold">
            {partner.name}
          </h2>
          <div className="mt-1 text-[12.5px] text-paper/55">{partner.phone}</div>

          <div className="mt-5 flex h-6 items-center gap-1.5">
            {phase === "connected" ? (
              <>
                <div className="font-mono text-[13px] font-bold tracking-widest text-saffron">
                  {timer}
                </div>
                {[14, 22, 16, 26, 19, 12, 24].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-saffron/75"
                    style={{
                      height: `${h}px`,
                      animation: `pulse 1s ease-in-out ${i * 0.14}s infinite`,
                    }}
                  />
                ))}
              </>
            ) : (
              <div className="text-[13px] font-bold tracking-wide text-paper/75">
                Calling<span className="animate-pulse">…</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-9">
          <div className="flex items-center justify-center gap-6">
            <CallToggle
              active={muted}
              label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((v) => !v)}
              renderIcon={() => (
                <>
                  <path d={PATHS.mic} />
                  {muted && <path d="M3 3l18 18" />}
                </>
              )}
            />
            <CallToggle
              active={speaker}
              label={speaker ? "Speaker on" : "Speaker"}
              onClick={() => setSpeaker((v) => !v)}
              renderIcon={() => (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  {speaker && <path d="M19 5a10 10 0 0 1 0 14" />}
                </>
              )}
            />
            <CallToggle
              active={keypad}
              label="Keypad"
              onClick={() => setKeypad((v) => !v)}
              renderIcon={() => (
                <g strokeLinecap="round">
                  <path d="M6 4h.01M12 4h.01M18 4h.01M6 10h.01M12 10h.01M18 10h.01M6 16h.01M12 16h.01M18 16h.01" />
                </g>
              )}
            />
          </div>

          <button
            type="button"
            onClick={handleEnd}
            className="flex h-[70px] w-[70px] cursor-pointer items-center justify-center rounded-full border-none bg-critical text-white shadow-[0_14px_34px_rgba(181,69,58,0.4)] transition-transform hover:scale-105 active:scale-95"
            aria-label="End call"
          >
            <svg
              width="28"
              height="28"
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

function CallToggle({
  active,
  label,
  onClick,
  renderIcon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  renderIcon: () => React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-2 border-none bg-transparent"
      aria-pressed={active}
    >
      <span
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors ${
          active ? "bg-white text-aztec" : "bg-aztec-3/80 text-paper"
        }`}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 2}
        >
          {renderIcon()}
        </svg>
      </span>
      <span className="text-[10.5px] font-semibold tracking-wide text-paper/60">
        {label}
      </span>
    </button>
  );
}
