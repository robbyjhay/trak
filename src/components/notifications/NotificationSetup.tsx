"use client";

import { useState, useEffect } from "react";
import {
  getPushUiState,
  requestPushPermissionAndSubscribe,
  type PushUiState
} from "@/hooks/usePushNotifications";
import { PATHS } from "@/components/icons";
import { useTrak } from "@/context/TrakStore";

export function NotificationSetup() {
  const { setNotificationsEnabled, showToast } = useTrak();
  const [pushState, setPushState] = useState<"checking" | PushUiState | "enabling">("checking");
  const [dismissed, setDismissed] = useState(false);

  const refreshPushState = async () => {
    try {
      const s = await getPushUiState();
      setPushState(s);
      setNotificationsEnabled(s === "enabled");
    } catch {
      setPushState("unsupported");
    }
  };

  useEffect(() => {
    if (localStorage.getItem("trak_notif_setup_dismissed")) {
      setDismissed(true);
    }
    refreshPushState();
    const onFocus = () => refreshPushState();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (dismissed || pushState === "checking" || pushState === "enabled" || pushState === "unsupported") {
    return null;
  }

  const handleEnable = async () => {
    if (pushState === "ios-install-required") return;
    setPushState("enabling");
    try {
      await requestPushPermissionAndSubscribe();
      await refreshPushState();
      showToast("Notifications enabled", "You're all set to receive alerts.");
    } catch (e: any) {
      await refreshPushState();
      showToast("Setup failed", typeof e?.message === "string" ? e.message : "Could not enable notifications.");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("trak_notif_setup_dismissed", "true");
  };

  return (
    <div className="mb-6 rounded-[14px] border border-primary/20 bg-primary/5 p-4 sm:p-5 relative overflow-hidden">
      <div className="flex items-start sm:items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={PATHS.bell} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-bold text-foreground">
            Never miss an update
          </h3>
          <p className="mt-1 text-[13px] text-foreground-secondary leading-relaxed">
            {pushState === "ios-install-required" 
              ? "To get notifications on your iPhone, you need to add TRAK to your Home Screen first."
              : pushState === "denied"
              ? "Notifications are blocked. Please allow them in your browser or device settings."
              : "Enable push notifications to get alerts for mentions, messages, and task reminders."}
          </p>
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap items-center gap-3 sm:ml-14 sm:mt-2">
        {pushState === "ios-install-required" ? (
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[12.5px] font-bold text-foreground border border-border">
            Tap Share <span className="text-primary">→</span> Add to Home Screen
          </div>
        ) : pushState === "denied" ? (
          <div className="rounded-lg bg-critical-surface px-3 py-2 text-[12.5px] font-bold text-critical-semantic">
            Blocked in settings
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={pushState === "enabling"}
            className="rounded-[9px] bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {pushState === "enabling" ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-[9px] bg-transparent px-4 py-2.5 text-[13px] font-bold text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
