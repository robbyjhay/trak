with open("src/context/TrakStore.tsx", "r") as f:
    ts = f.read()

old_notify = """  const maybeOsNotify = useCallback(
    (userId: string, text: string) => {
      if (
        notificationsEnabled &&
        session.id === userId &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Trak", {
            body: text,
            tag: "trak-" + Math.random().toString(36).slice(2),
          });
        } catch {
          /* in-app bell still has it */
        }
      }
    },
    [notificationsEnabled, session.id],
  );

  const mergeNotifications = useCallback(
    (notifications?: Notification[]) => {
      if (!notifications) return;
      const mine = notifications.filter((n) => n.userId === session.id);
      const prev = stateRef.current.db.notifications;
      const prevUnread = new Set(
        prev
          .filter((n) => n.userId === session.id && !n.read)
          .map((n) => n.id),
      );
      for (const n of mine) {
        if (!prevUnread.has(n.id) && !n.read) {
          maybeOsNotify(n.userId, n.text);
        }
      }
      stateRef.current.db.notifications = notifications;
    },
    [maybeOsNotify, session.id],
  );"""

new_notify = """  // Web Push via the Service Worker is the SOLE OS-level notification path.
  // Polling here only synchronizes in-app state (badge / bell / toasts).
  // See Phase 1 P0 fix: never fire OS alerts from polling —
  // it duplicates SW push and is unreliable on mobile PWAs.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const mergeNotifications = useCallback(
    (notifications?: Notification[]) => {
      if (!notifications) return;
      const mine = notifications.filter((n) => n.userId === session.id);
      const prev = stateRef.current.db.notifications || [];
      const prevIds = new Set(prev.map((n) => n.id));
      const fresh = mine.filter((n) => !prevIds.has(n.id) && !n.read);

      const map = new Map(prev.map(n => [n.id, n]));
      for (const n of notifications) {
        map.set(n.id, n);
      }
      stateRef.current.db.notifications = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // In-app toast for genuinely new arrivals (P2/P7). One toast per batch,
      // suppressed when the user is already looking at the target route and
      // when the tab is hidden (SW push covers that case).
      if (fresh.length > 0 && typeof document !== "undefined" && document.visibilityState === "visible") {
        const latest = [...fresh].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
        try {
          const path = window.location.pathname || "";
          const target = latest.activityId
            ? `/activity/${latest.activityId}`
            : latest.type === "dm" || latest.type === "mention" || latest.type === "community" || latest.type === "broadcast"
              ? "/messages"
              : null;
          const onTarget = !!target && (path === target || path.startsWith(target + "/"));
          if (!onTarget && latest.text) {
            showToastRef.current("New notification", latest.text.length > 120 ? `${latest.text.slice(0, 120)}…` : latest.text);
          }
        } catch {
          /* toast is best-effort */
        }
      }
    },
    [session.id],
  );"""

ts = ts.replace(old_notify, new_notify)

with open("src/context/TrakStore.tsx", "w") as f:
    f.write(ts)
