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

export function usePushNotifications() {
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (isRegisteredRef.current) return;
    isRegisteredRef.current = true;

    async function registerSwAndPush() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        
        // We only try to subscribe if they already granted permission or if we are prompting.
        // Better to not prompt immediately on load. But if they granted, we ensure subscription is synced.
        if (Notification.permission === "granted") {
          await subscribeToPush(registration);
        }
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    }

    registerSwAndPush();
  }, []);
}

export async function requestPushPermissionAndSubscribe() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push not supported");
  }
  
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission not granted for Notification");
  }

  const registration = await navigator.serviceWorker.ready;
  await subscribeToPush(registration);
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    const res = await apiGet<{ publicKey: string }>("/api/push/vapid-public-key");
    const applicationServerKey = urlBase64ToUint8Array(res.publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await apiSend("/api/push/subscribe", "POST", {
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    console.error("Failed to subscribe to push", error);
  }
}
