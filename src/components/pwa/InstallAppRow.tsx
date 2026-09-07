"use client";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useTrak } from "@/context/TrakStore";
import { PATHS } from "@/components/icons";

/**
 * In-app PWA install action.
 * - Chrome/Android/desktop: "Install TRAK" button only while a deferred
 *   `beforeinstallprompt` is available. Hidden when installed, while
 *   checking, or where installation isn't offered (never a fake prompt).
 * - iOS/iPadOS: Add-to-Home-Screen guidance instead (no prompt API there).
 */
export function InstallAppRow() {
  const { status, busy, promptInstall } = usePwaInstall();
  const { showToast } = useTrak();

  if (status === "installed" || status === "checking" || status === "unavailable") {
    return null;
  }

  const handleInstall = () => {
    void (async () => {
      const outcome = await promptInstall().catch(() => "dismissed" as const);
      if (outcome === "dismissed") {
        showToast(
          "Install dismissed",
          "You can install TRAK any time from your browser's Install option.",
        );
      }
    })();
  };

  return (
    <div className="mb-[22px] flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-2 shadow-card">
      <div className="flex min-w-0 items-center gap-2.5">
        <svg
          className="shrink-0 text-primary"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d={PATHS.download} />
        </svg>
        <span className="truncate text-[12.5px] font-bold text-foreground">
          Install TRAK
        </span>
        <span className="hidden truncate text-[12px] text-foreground-secondary md:inline">
          {status === "ios-guidance"
            ? "Add TRAK to your Home Screen for the full app experience."
            : "Get the TRAK app with offline-ready background notifications."}
        </span>
      </div>
      {status === "ios-guidance" ? (
        <div className="flex shrink-0 flex-col items-end text-right">
          <span className="mb-1 inline-block rounded-md bg-surface-muted px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-muted-foreground">
            Add to Home Screen
          </span>
          <p className="w-44 text-[10px] leading-tight text-muted-foreground">
            In Safari tap Share → Add to Home Screen, then open TRAK from the
            Home Screen.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          disabled={busy}
          className="shrink-0 cursor-pointer rounded-lg border-none bg-black px-4 py-2 text-[13px] font-bold whitespace-nowrap text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {busy ? "Installing…" : "Install App"}
        </button>
      )}
    </div>
  );
}
