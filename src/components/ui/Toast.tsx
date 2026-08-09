"use client";

import { useTrak } from "@/context/TrakStore";
import { PATHS } from "@/components/icons";

export function Toast() {
  const { toast } = useTrak();
  return (
    <div
      className={`fixed bottom-4 right-4 left-4 z-[200] flex max-w-[380px] items-center gap-3 rounded-[14px] bg-aztec px-5 py-4 text-white shadow-toast transition-all duration-400 sm:left-auto sm:bottom-7 sm:right-7 ${
        toast.show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[140%] opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-saffron text-aztec">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d={PATHS.check} />
        </svg>
      </div>
      <div>
        <div className="text-[13.5px] font-bold">{toast.title}</div>
        <div className="text-xs leading-snug text-paper/65">{toast.desc}</div>
      </div>
    </div>
  );
}
