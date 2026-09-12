import type { Notification } from "@/lib/types";

const MESSAGE_TYPES = new Set<Notification["type"]>([
  "dm",
  "community",
  "mention",
  "announcement",
]);

export function countUnreadMessages(notifications: Notification[]): number {
  return notifications.reduce(
    (total, n) => total + (!n.read && MESSAGE_TYPES.has(n.type) ? 1 : 0),
    0,
  );
}
