/**
 * User presence status for the Connect/Messages UI.
 *
 * - "online":  positively confirmed by the active signaling system
 * - "offline": reliably confirmed offline (signaling connected, presence synced, user absent)
 * - "unknown": presence cannot be determined (disconnected, reconnecting, or bootstrap pending)
 */
export type PresenceStatus = "online" | "offline" | "unknown";

/**
 * Determine a user's presence status.
 *
 * @param userId         - the target user's ID
 * @param onlineUsers    - Set of user IDs known to be online via the signaling system
 * @param signalingConnected - whether the current user's WebSocket signaling is connected
 * @param presenceSynced     - whether the initial `online_users` bootstrap has been received
 *
 * Three states produce "unknown":
 * 1. signalingConnected is false (disconnected / reconnecting)
 * 2. signalingConnected is true but presenceSynced is false (connected, bootstrap pending)
 * 3. Both flags true — normal operation, returns "online" or "offline"
 *
 * This prevents a freshly connected client from showing everyone as "Offline"
 * before the server has delivered the authoritative online_users list.
 */
export function getPresenceStatus(
  userId: string,
  onlineUsers: Set<string>,
  signalingConnected: boolean,
  presenceSynced: boolean,
): PresenceStatus {
  if (!signalingConnected || !presenceSynced) return "unknown";
  return onlineUsers.has(userId) ? "online" : "offline";
}

/**
 * WhatsApp-style "last seen" label for an offline user showing the actual
 * time/date rather than a relative duration.
 *
 * Examples:
 *  - "Last seen recently"               (just disconnected, <60s)
 *  - "Last seen today at 5:32 PM"
 *  - "Last seen yesterday at 9:15 AM"
 *  - "Last seen Monday at 8:00 AM"      (within the past week)
 *  - "Last seen Jun 15 at 2:30 PM"      (older, current year)
 *  - "Last seen Mar 5, 2024 at 9:00 AM" (older, previous year)
 *  - "Last seen recently"               (no timestamp available)
 *
 * @param iso - ISO timestamp (from `User.lastSeenAt`), or null/undefined.
 * @param now - current time used as the reference point (injectable for tests).
 */
export function formatLastOnline(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "Last seen recently";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "Last seen recently";

  const diffSec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (diffSec < 60) return "Last seen recently";

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(t);

  const dayMs = 86_400_000;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (t >= startOfToday) return `Last seen today at ${time}`;

  const startOfYesterday = startOfToday - dayMs;
  if (t >= startOfYesterday) return `Last seen yesterday at ${time}`;

  const startOfWeek = startOfToday - 6 * dayMs;
  if (t >= startOfWeek) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(t);
    return `Last seen ${weekday} at ${time}`;
  }

  const sameYear = new Date(t).getFullYear() === now.getFullYear();
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(t);
  return `Last seen ${date} at ${time}`;
}
