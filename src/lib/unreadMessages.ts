import type { Activity, Notification } from "@/lib/types";

const MESSAGE_TYPES = new Set<Notification["type"]>([
  "dm",
  "community",
  "mention",
  "announcement",
]);

function countUnreadByType(
  notifications: Notification[],
  types: Set<Notification["type"]>,
): number {
  return notifications.reduce(
    (total, n) => total + (!n.read && types.has(n.type) ? 1 : 0),
    0,
  );
}

export function countUnreadMessages(notifications: Notification[]): number {
  return countUnreadByType(notifications, MESSAGE_TYPES);
}

/**
 * Library badge: the Unit Head watches the review queue (library_submitted),
 * every other member watches newly published resources (library_new).
 */
export function countUnreadLibrary(
  notifications: Notification[],
  isHeadUser: boolean,
): number {
  const types = new Set<Notification["type"]>([
    isHeadUser ? "library_submitted" : "library_new",
  ]);
  return countUnreadByType(notifications, types);
}

/**
 * Innovation badge: the Unit Head watches the review queue
 * (innovation_submitted), every other member watches newly approved ideas
 * (innovation_new).
 */
export function countUnreadInnovation(
  notifications: Notification[],
  isHeadUser: boolean,
): number {
  const types = new Set<Notification["type"]>([
    isHeadUser ? "innovation_submitted" : "innovation_new",
  ]);
  return countUnreadByType(notifications, types);
}

/**
 * Activities badge: number of pending activities relevant to the user —
 * mirrors what the /activities page shows for the session user.
 */
export function countPendingActivities(
  activities: Activity[],
  userId: string,
  isHeadUser: boolean,
): number {
  return activities.filter((a) => {
    if (a.softDeletedAt) return false;
    if (a.status !== "pending") return false;
    if (isHeadUser) return true;
    if (a.hidden) return false;
    if (a.createdBy === userId || a.assigneeId === userId) return true;
    return Boolean(
      a.collaborators?.some(
        (c) => c.userId === userId && c.status === "accepted",
      ),
    );
  }).length;
}