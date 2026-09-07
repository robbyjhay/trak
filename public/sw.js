self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {});

function resolveTargetUrl(raw) {
  const fallback = "/dashboard";
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;
  // Block protocol-relative / credentialed redirects from push payloads.
  if (raw.startsWith("//")) return fallback;
  return raw;
}

self.addEventListener("push", (event) => {
  // No payload (e.g. some Android/FCM edge cases) — still show something
  // useful rather than dropping the notification silently.
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification("TRAK", {
        body: "You have a new notification. Open TRAK to view it.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/dashboard" },
        tag: "trak-" + Date.now(),
      })
    );
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("Error parsing push notification", e);
    event.waitUntil(
      self.registration.showNotification("TRAK", {
        body: "You have a new notification. Open TRAK to view it.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "/dashboard" },
        tag: "trak-" + Date.now(),
      })
    );
    return;
  }

  const title = data.title || "TRAK";
  // Server sends a unique tag per notification (trak-<id>) so concurrent
  // notifications never overwrite each other.
  const tag = data.tag || "trak-" + Date.now();
  const options = {
    body: data.body || "Open TRAK to view details.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data || {},
    tag,
    renotify: false,
  };

  const targetUrl = resolveTargetUrl(options.data.url || "/dashboard");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If any client is focused on the exact target location, suppress the system notification.
      const isFocusedOnTarget = clientList.some((client) => {
        if (!client.focused) return false;
        try {
          const clientPath = new URL(client.url).pathname;
          // If they are on the specific target route (e.g., /messages), don't send a push.
          // Note: for /messages we might want to notify them if they are in a different thread, 
          // but we don't have thread granularity in the push payload right now, so suppressing 
          // on the top-level route is a reasonable start.
          return clientPath === targetUrl || clientPath.startsWith(targetUrl + "/");
        } catch {
          return false;
        }
      });

      if (isFocusedOnTarget) {
        console.log("Client is actively focused on the target route, skipping system notification.");
        return;
      }
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const payloadData = event.notification.data || {};
  const urlToOpen = resolveTargetUrl(payloadData.url || "/dashboard");
  const absoluteUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});

// Re-subscribe when the push service expires our subscription (notably on
// Android/Chrome). Without this, background notifications silently stop.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/vapid-public-key", { credentials: "include" });
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (e) {
        console.error("pushsubscriptionchange resubscribe failed", e);
      }
    })()
  );
});
