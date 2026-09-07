"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PwaInstallStatus =
  | "checking"
  | "available"
  | "installed"
  | "ios-guidance"
  | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Pure helper — unit-tested. Matches iPhone/iPod/iPad incl. iPadOS desktop-UA. */
export function isIosUserAgent(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}

/** Pure helper — unit-tested. */
export function isStandaloneMode(
  displayModeStandalone: boolean,
  navigatorStandalone: boolean,
): boolean {
  return displayModeStandalone || navigatorStandalone;
}

function detectIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return isIosUserAgent(
    navigator.userAgent || "",
    navigator.platform || "",
    navigator.maxTouchPoints || 0,
  );
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  let displayStandalone = false;
  try {
    displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  } catch {
    /* ignore */
  }
  const navStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandaloneMode(displayStandalone, navStandalone);
}

/**
 * PWA install experience (Chrome + iOS handled separately).
 *
 * - Captures `beforeinstallprompt` (preventDefault defers only Chrome's
 *   automatic mini-infobar — the native address-bar Install icon still
 *   appears naturally whenever Chrome deems TRAK installable).
 * - `appinstalled` / standalone display-mode hides the in-app action.
 * - iOS/iPadOS never fires `beforeinstallprompt`; those users get
 *   Add-to-Home-Screen guidance instead (never a fake Install button).
 */
export function usePwaInstall() {
  const [status, setStatus] = useState<PwaInstallStatus>("checking");
  const [busy, setBusy] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (detectStandalone()) {
      setStatus("installed");
      return;
    }
    if (detectIos()) {
      // No deferred prompt will ever arrive on iOS — show guidance.
      setStatus("ios-guidance");
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      // Defer the automatic prompt so our in-app "Install TRAK" action
      // triggers it. The omnibox Install icon is unaffected.
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setStatus("available");
    };
    const onAppInstalled = () => {
      deferredRef.current = null;
      setStatus("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed"> => {
    const deferred = deferredRef.current;
    if (!deferred) return "dismissed";
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // The prompt object is single-use; Chrome may fire
      // `beforeinstallprompt` again later if the user dismisses.
      deferredRef.current = null;
      if (outcome === "accepted") {
        // `appinstalled` will confirm; optimistically hide the action.
        setStatus("installed");
      } else {
        setStatus("unavailable");
      }
      return outcome;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    busy,
    canPrompt: status === "available",
    installed: status === "installed",
    promptInstall,
  };
}
