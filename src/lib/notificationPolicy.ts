import type { NotifType } from "@/lib/types";

/**
 * Client-safe notification policy (no server imports).
 * Used by the centralized pipeline (`notifications.ts`), the settings UI,
 * and unit tests. Preferences gate DELIVERY (web push) only — never history.
 */

export interface PushPrefs {
  notificationsEnabled: boolean;
  dmNotifications: boolean;
  activityNotifications: boolean;
}

/** Preference category per notification type. Broadcasts are mandatory. */
export function prefAllowsPush(prefs: PushPrefs | null, type: NotifType): boolean {
  if (type === "broadcast") return true;
  if (!prefs) return true;
  if (!prefs.notificationsEnabled) return false;
  if (type === "dm" || type === "community" || type === "mention") {
    return prefs.dmNotifications;
  }
  // activity_* | comment | profile_updated | library_*
  return prefs.activityNotifications;
}

export function resolvePushContent(
  type: NotifType,
  text: string,
  activityId?: string | null,
): { title: string; body: string; url: string } {
  if (type === "dm") {
    return { title: "New message", body: text, url: "/messages" };
  }
  if (type === "community") {
    return { title: "New community message", body: text, url: "/messages" };
  }
  if (type === "mention") {
    return { title: "You were mentioned", body: text, url: "/messages" };
  }
  if (type === "broadcast") {
    return { title: "Unit announcement", body: text, url: "/messages" };
  }
  if (type === "comment") {
    return {
      title: "New comment",
      body: text,
      url: activityId ? `/activity/${activityId}` : "/activities",
    };
  }
  if (type === "activity_reminder") {
    return {
      title: "Task reminder",
      body: text,
      url: activityId ? `/activity/${activityId}` : "/activities",
    };
  }
  if (type === "library_submitted") {
    return { title: "New Library submission", body: text, url: "/library/manage" };
  }
  if (type === "library_new") {
    return { title: "New Library resource", body: text, url: "/library" };
  }
  if (type === "library_approved" || type === "library_declined") {
    return { title: "Library update", body: text, url: "/library" };
  }
  if (type === "innovation_submitted") {
    return { title: "New Innovation submitted", body: text, url: "/innovation-hub/manage" };
  }
  if (type === "innovation_approved") {
    return { title: "Innovation approved!", body: text, url: "/innovation-hub" };
  }
  if (type === "innovation_declined") {
    return { title: "Innovation update", body: text, url: "/innovation-hub" };
  }
  if (type === "innovation_implemented") {
    return { title: "Innovation implemented!", body: text, url: "/innovation-hub" };
  }
  // activity_created | activity_completed | activity_missed
  return {
    title: "Activity update",
    body: text,
    url: activityId ? `/activity/${activityId}` : "/activities",
  };
}

/**
 * Notification taxonomy (Phase 5) — one entry per legitimate TRAK event.
 * `prefCategory: mandatory` bypasses preference gates; history is ALWAYS persisted.
 */
export const NOTIFICATION_TAXONOMY: Record<
  NotifType,
  {
    recipient: string;
    title: string;
    deepLink: string;
    prefCategory: "mandatory" | "messages" | "activities";
    dedupe: string;
  }
> = {
  activity_created: {
    recipient: "Unit Head (or creator fallback when no head exists)",
    title: "Activity update",
    deepLink: "/activity/:id",
    prefCategory: "activities",
    dedupe: "60s identical-event window + exception-request key",
  },
  activity_completed: {
    recipient: "Unit Head on completion; owner on late-submission confirmations",
    title: "Activity update",
    deepLink: "/activity/:id",
    prefCategory: "activities",
    dedupe: "60s identical-event window + exception-approve/reject keys",
  },
  activity_missed: {
    recipient: "Activity owner (grace-period expiry, rejections)",
    title: "Activity update",
    deepLink: "/activity/:id",
    prefCategory: "activities",
    dedupe: "60s identical-event window + exception-reject key",
  },
  activity_reminder: {
    recipient: "Activity owner (morning, due-now, end-of-day triggers)",
    title: "Task reminder",
    deepLink: "/activity/:id",
    prefCategory: "activities",
    dedupe: "reminder:{activityId}:{trigger}:{date}:{version}",
  },
  comment: {
    recipient: "Activity owner (when someone else comments)",
    title: "New comment",
    deepLink: "/activity/:id",
    prefCategory: "activities",
    dedupe: "60s identical-event window",
  },
  dm: {
    recipient: "DM recipient (never self)",
    title: "New message",
    deepLink: "/messages",
    prefCategory: "messages",
    dedupe: "one record per messageId per recipient",
  },
  community: {
    recipient: "Every active user except author and mentioned users",
    title: "New community message",
    deepLink: "/messages",
    prefCategory: "messages",
    dedupe: "one record per messageId per recipient",
  },
  mention: {
    recipient: "Mentioned users (never author); replaces the community copy",
    title: "You were mentioned",
    deepLink: "/messages",
    prefCategory: "messages",
    dedupe: "one record per messageId per recipient",
  },
  profile_updated: {
    recipient: "all",
    title: "Profile Updated",
    deepLink: "/",
    prefCategory: "activities",
    dedupe: "profile_updated",
  },
  broadcast: {
    recipient: "Every active user except sender",
    title: "Unit announcement",
    deepLink: "/messages",
    prefCategory: "mandatory",
    dedupe: "one record per messageId per recipient",
  },
  library_submitted: {
    recipient: "Unit Head(s) on member submission",
    title: "New Library submission",
    deepLink: "/library/manage",
    prefCategory: "activities",
    dedupe: "60s identical-event window + submission key",
  },
  library_new: {
    recipient: "Every active member (except submitter) on submission",
    title: "New Library resource",
    deepLink: "/library",
    prefCategory: "activities",
    dedupe: "60s identical-event window + submission key",
  },
  library_approved: {
    recipient: "Submitting member on approval",
    title: "Library update",
    deepLink: "/library",
    prefCategory: "activities",
    dedupe: "60s identical-event window + review key",
  },
  library_declined: {
    recipient: "Submitting member on decline (with reason)",
    title: "Library update",
    deepLink: "/library",
    prefCategory: "activities",
    dedupe: "60s identical-event window + review key",
  },
  innovation_submitted: {
    recipient: "Unit Head(s) on member submission",
    title: "New Innovation submitted",
    deepLink: "/innovation-hub/manage",
    prefCategory: "activities",
    dedupe: "60s identical-event window + submission key",
  },
  innovation_approved: {
    recipient: "Submitting member on approval",
    title: "Innovation approved!",
    deepLink: "/innovation-hub",
    prefCategory: "activities",
    dedupe: "60s identical-event window + review key",
  },
  innovation_declined: {
    recipient: "Submitting member on decline (with reason)",
    title: "Innovation update",
    deepLink: "/innovation-hub",
    prefCategory: "activities",
    dedupe: "60s identical-event window + review key",
  },
  innovation_implemented: {
    recipient: "Submitting member when marked implemented",
    title: "Innovation implemented!",
    deepLink: "/innovation-hub",
    prefCategory: "activities",
    dedupe: "60s identical-event window + implement key",
  },
};
