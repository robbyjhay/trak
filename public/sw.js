self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {});

self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "TRAK";
      const options = {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: data.data || {},
        tag: data.tag || undefined,
      };

      const targetUrl = options.data.url || "/dashboard";

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
    } catch (e) {
      console.error("Error parsing push notification", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const payloadData = event.notification.data || {};
  const urlToOpen = payloadData.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
