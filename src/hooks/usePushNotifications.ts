import { useEffect, useRef } from "react";
import { apiGet, apiSend } from "@/lib/api/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushUiState =
  | "unsupported"
  | "ios-install-required"
  | "denied"
  | "disabled"
  | "enabling"
  | "enabled";

export function isPushApiSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isiOS || isIPadOS;
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch { /* ignore */ }
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** True when running as iOS Safari tab that cannot use Web Push until installed. */
export function needsIosPwaInstall(): boolean {
  return isIosDevice() && !isStandalonePwa() && !isPushApiSupported();
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    // Reuse the existing registration — never force a re-register storm.
    const existing =
      await navigator.serviceWorker.getRegistration("/");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

async function syncSubscriptionToServer(
  subscription: PushSubscription,
): Promise<void> {
  await apiSend("/api/push/subscribe", "POST", {
    subscription: subscription.toJSON(),
  });
}

/**
 * App-load lifecycle (Phase 2):
 * 1. register / reuse the SW,
 * 2. read the EXISTING push subscription,
 * 3. sync it to the server if present,
 * 4. NEVER create a subscription or prompt for permission unprompted.
 */
export function usePushNotifications() {
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isPushApiSupported()) {
      return;
    }

    if (isRegisteredRef.current) return;
    isRegisteredRef.current = true;

    (async () => {
      try {
        const registration = await getRegistration();
        if (!registration) return;
        // Only sync — do not subscribe. Subscription happens exclusively
        // via explicit user action (requestPushPermissionAndSubscribe).
        if (Notification.permission === "granted") {
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            await syncSubscriptionToServer(existing).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    })();
  }, []);
}

export class PushError extends Error {
  constructor(
    public code: "unsupported" | "ios-install-required" | "denied" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "PushError";
  }
}

/** Resolve the real UI state from browser permission + subscription. */
export async function getPushUiState(): Promise<Exclude<PushUiState, "enabling">> {
  if (typeof window === "undefined") return "unsupported";
  if (needsIosPwaInstall()) return "ios-install-required";
  if (!isPushApiSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (Notification.permission === "granted" && sub) return "enabled";
  } catch {
    /* fall through to disabled */
  }
  return "disabled";
}

export async function requestPushPermissionAndSubscribe(): Promise<void> {
  if (needsIosPwaInstall()) {
    throw new PushError(
      "ios-install-required",
      "To enable notifications on iPhone/iPad, open TRAK from your Home Screen: in Safari tap Share → Add to Home Screen, then open the TRAK app and enable push there.",
    );
  }
  if (!isPushApiSupported()) {
    throw new PushError("unsupported", "Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new PushError(
      "denied",
      "Permission denied. Please enable notifications in your browser or device settings.",
    );
  }

  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.ready);

  // Reuse the existing subscription — do NOT create duplicates on re-enable.
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await syncSubscriptionToServer(existing);
    return;
  }

  try {
    const res = await apiGet<{ publicKey: string }>("/api/push/vapid-public-key");
    const applicationServerKey = urlBase64ToUint8Array(res.publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await syncSubscriptionToServer(subscription);
  } catch (error) {
    console.error("Failed to subscribe to push", error);
    throw new PushError(
      "failed",
      error instanceof Error ? error.message : "Failed to enable push notifications.",
    );
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    const endpoint = sub?.endpoint ?? null;
    if (sub) {
      await sub.unsubscribe().catch(() => {});
    }
    // Remove the server-side subscription. History is untouched.
    await apiSend("/api/push/subscribe", "DELETE", endpoint ? { endpoint } : {}).catch(() => {});
  } catch (error) {
    console.error("Failed to unsubscribe from push", error);
    throw error instanceof Error ? error : new Error("Failed to disable push notifications.");
  }
}
