"use client";

import { useEffect, useState } from "react";
import { useTrak } from "@/context/TrakStore";
import { cn } from "@/lib/utils";

export function OfflineSyncIndicator() {
  const { isSyncing, pendingMutations, failedMutations, retryFailedMutations } = useTrak();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-[.is-syncing]:opacity-100"
      aria-label="offline sync status"
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={cn("hidden sm:block", isSyncing && "block", pendingMutations > 0 && "block")}
        aria-label="syncing"
      >
        <circle
          cx={12}
          cy={12}
          r={10}
          strokeWidth={2}
          className="opacity-20"
        />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 0114.7-5.3"
        />
      </svg>
      {pendingMutations > 0 && (
        <span className={cn("text-[9px] font-semibold text-foreground-secondary", pendingMutations > 9 ? "text-[9px] text-foreground-faint" : "")}>
          {pendingMutations > 9 ? "9+" : pendingMutations}
        </span>
      )}
      {failedMutations > 0 && (
        <button
          onClick={retryFailedMutations}
          className="rounded-full bg-critical/5 border border-critical/10 px-2 py-0.5 text-[9px] font-semibold text-critical hover:bg-critical/10 focus-visible:ring-2 focus-visible:ring-critical focus-visible:outline-none"
          title="Retry failed mutations"
          aria-label="Retry failed mutations"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}