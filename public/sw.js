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

      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          // If any client is focused, we assume the user is actively using the app.
          // In that case, we might not want to show a system notification (or maybe a softer one).
          // For now, let's skip the push notification if a client is focused.
          const isFocused = clientList.some((client) => client.focused);
          if (isFocused) {
            console.log("Client is focused, skipping system notification.");
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
