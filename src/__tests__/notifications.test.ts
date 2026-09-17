import { describe, expect, test } from "vitest";
import {
  NOTIFICATION_TAXONOMY,
  prefAllowsPush,
  resolveNotificationDeepLink,
  resolvePushContent,
} from "@/lib/notificationPolicy";
import type { NotifType, Notification } from "@/lib/types";

const ALL_TYPES: NotifType[] = [
  "comment",
  "dm",
  "community",
  "activity_created",
  "activity_completed",
  "activity_missed",
  "activity_reminder",
  "broadcast",
  "announcement",
  "mention",
  "work_delegated",
  "collaboration_invite",
  "collaboration_accepted",
  "collaboration_declined",
  "library_submitted",
  "library_new",
  "library_approved",
  "library_declined",
  "innovation_submitted",
  "innovation_new",
  "innovation_approved",
  "innovation_declined",
  "innovation_implemented",
  "onboarding_requested",
  "onboarding_approved",
  "onboarding_declined",
  "profile_updated",
  "member_onboarded",
];

describe("notification preferences gate delivery, never history", () => {
  test("broadcast is mandatory — delivered even when everything is off", () => {
    expect(
      prefAllowsPush(
        { notificationsEnabled: false, dmNotifications: false, activityNotifications: false },
        "broadcast",
      ),
    ).toBe(true);
  });

  test("master toggle off blocks dm/activity/community/mention push", () => {
    const off = { notificationsEnabled: false, dmNotifications: true, activityNotifications: true };
    for (const t of ["dm", "community", "mention", "activity_created", "comment"] as NotifType[]) {
      expect(prefAllowsPush(off, t)).toBe(false);
    }
  });

  test("dm/community/mention follow the messages toggle, not the activity toggle", () => {
    const prefs = { notificationsEnabled: true, dmNotifications: false, activityNotifications: true };
    expect(prefAllowsPush(prefs, "dm")).toBe(false);
    expect(prefAllowsPush(prefs, "community")).toBe(false);
    expect(prefAllowsPush(prefs, "mention")).toBe(false);
    expect(prefAllowsPush(prefs, "activity_created")).toBe(true);
  });

  test("activity types follow the activity toggle", () => {
    const prefs = { notificationsEnabled: true, dmNotifications: true, activityNotifications: false };
    expect(prefAllowsPush(prefs, "activity_created")).toBe(false);
    expect(prefAllowsPush(prefs, "activity_completed")).toBe(false);
    expect(prefAllowsPush(prefs, "activity_missed")).toBe(false);
    expect(prefAllowsPush(prefs, "comment")).toBe(false);
    expect(prefAllowsPush(prefs, "dm")).toBe(true);
  });

  test("missing prefs default to deliver (history always exists regardless)", () => {
    for (const t of ALL_TYPES) {
      expect(prefAllowsPush(null, t)).toBe(true);
    }
  });
});

describe("push deep links", () => {
  test("message types link to /messages", () => {
    for (const t of ["dm", "community", "mention", "broadcast", "announcement"] as NotifType[]) {
      expect(resolvePushContent(t, "hello").url).toBe("/messages");
    }
  });

  test("activity types link to the singular activity route", () => {
    for (const t of ["activity_created", "activity_completed", "activity_missed", "comment", "activity_reminder"] as NotifType[]) {
      expect(resolvePushContent(t, "hello", "abc-123").url).toBe("/activity/abc-123");
    }
  });

  test("activity reminder push uses a 'Task reminder' title (Fix 3)", () => {
    expect(resolvePushContent("activity_reminder", "Your task is due now.", "abc-123")).toEqual({
      title: "Task reminder",
      body: "Your task is due now.",
      url: "/activity/abc-123",
    });
  });

  test("activity types without an id fall back to list routes", () => {
    expect(resolvePushContent("activity_created", "hello", null).url).toBe("/activities");
    expect(resolvePushContent("comment", "hello").url).toBe("/activities");
  });

  test("collaboration types link to the activity and follow the activity toggle", () => {
    for (const t of ["collaboration_invite", "collaboration_accepted", "collaboration_declined"] as NotifType[]) {
      expect(resolvePushContent(t, "hello", "abc-123").url).toBe("/activity/abc-123");
      const prefs = { notificationsEnabled: true, dmNotifications: true, activityNotifications: false };
      expect(prefAllowsPush(prefs, t)).toBe(false);
    }
    expect(resolvePushContent("collaboration_invite", "hello").title).toBe("Collaboration invite");
  });
});

describe("resolveNotificationDeepLink", () => {
  function notif(type: NotifType, overrides: Partial<Notification> = {}) {
    return {
      id: "1",
      userId: "u1",
      type,
      text: "hi",
      activityId: null,
      createdAt: new Date().toISOString(),
      read: false,
      ...overrides,
    };
  }

  test("message types link to /messages", () => {
    for (const t of ["dm", "community", "mention", "broadcast", "announcement"] as NotifType[]) {
      expect(resolveNotificationDeepLink(notif(t))).toBe("/messages");
    }
  });

  test("message types link to /messages even with an activityId present", () => {
    expect(
      resolveNotificationDeepLink(notif("dm", { activityId: "abc-123" })),
    ).toBe("/messages");
  });

  test("message types deep-link to the exact message when messageId exists", () => {
    for (const t of ["dm", "community", "mention", "announcement"] as NotifType[]) {
      expect(
        resolveNotificationDeepLink(notif(t, { messageId: "msg-42" })),
      ).toBe("/messages?message=msg-42");
    }
    // Broadcasts are not a thread, so they stay on the plain messages route.
    expect(
      resolveNotificationDeepLink(notif("broadcast", { messageId: "msg-42" })),
    ).toBe("/messages");
  });

  test("activity types deep-link to the singular activity when activityId exists", () => {
    for (const t of ["activity_created", "activity_completed", "activity_missed", "activity_reminder", "comment", "work_delegated", "collaboration_invite", "collaboration_accepted", "collaboration_declined"] as NotifType[]) {
      expect(resolveNotificationDeepLink(notif(t, { activityId: "abc-123" }))).toBe("/activity/abc-123");
    }
  });

  test("library types link to the library sections", () => {
    expect(resolveNotificationDeepLink(notif("library_submitted"))).toBe("/library/manage");
    expect(resolveNotificationDeepLink(notif("library_new"))).toBe("/library");
    expect(resolveNotificationDeepLink(notif("library_approved"))).toBe("/library");
    expect(resolveNotificationDeepLink(notif("library_declined"))).toBe("/library");
  });

  test("innovation types link to the innovation sections", () => {
    expect(resolveNotificationDeepLink(notif("innovation_submitted"))).toBe("/innovation-cloud/manage");
    expect(resolveNotificationDeepLink(notif("innovation_new"))).toBe("/innovation-cloud");
    expect(resolveNotificationDeepLink(notif("innovation_approved"))).toBe("/innovation-cloud");
    expect(resolveNotificationDeepLink(notif("innovation_declined"))).toBe("/innovation-cloud");
    expect(resolveNotificationDeepLink(notif("innovation_implemented"))).toBe("/innovation-cloud");
  });

  test("onboarding types link to /onboarding", () => {
    for (const t of ["onboarding_requested", "onboarding_approved", "onboarding_declined"] as NotifType[]) {
      expect(resolveNotificationDeepLink(notif(t))).toBe("/onboarding");
    }
  });

  test("unknown types fall back to the home route", () => {
    expect(resolveNotificationDeepLink(notif("profile_updated"))).toBe("/");
    expect(resolveNotificationDeepLink(notif("member_onboarded"))).toBe("/");
  });
});

describe("notification taxonomy", () => {
  test("covers every NotifType with recipient, deep link, and pref category", () => {
    for (const t of ALL_TYPES) {
      const entry = NOTIFICATION_TAXONOMY[t];
      expect(entry, `missing taxonomy for ${t}`).toBeDefined();
      expect(entry.recipient.length).toBeGreaterThan(0);
      expect(entry.deepLink.startsWith("/")).toBe(true);
      expect(["mandatory", "messages", "activities"]).toContain(entry.prefCategory);
      expect(entry.dedupe.length).toBeGreaterThan(0);
    }
  });

  test("only broadcast is mandatory", () => {
    for (const t of ALL_TYPES) {
      expect(NOTIFICATION_TAXONOMY[t].prefCategory === "mandatory").toBe(t === "broadcast");
    }
  });
});

describe("centralized pipeline regression guards", () => {
  test("service routes creation through notifyUser (single entry point)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const service = readFileSync(join(process.cwd(), "src/lib/db/service.ts"), "utf8");
    expect(service).toContain("notifyUser(");
    // No raw notification creation left outside the pipeline + read paths.
    const creates = service.match(/prisma\.notification\.create/g) ?? [];
    expect(creates.length).toBe(0);
  });

  test("polling path never fires OS notifications directly", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const store = readFileSync(join(process.cwd(), "src/context/TrakStore.tsx"), "utf8");
    expect(store).not.toContain("new Notification(");
    expect(store).not.toContain("maybeOsNotify");
  });

  test("push subscription lifecycle reuses existing subscriptions", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const hook = readFileSync(join(process.cwd(), "src/hooks/usePushNotifications.ts"), "utf8");
    expect(hook).toContain("getSubscription()");
    expect(hook).toContain("unsubscribeFromPush");
  });

  test("unsubscribe endpoint exists and preserves history", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const route = readFileSync(join(process.cwd(), "src/app/api/push/subscribe/route.ts"), "utf8");
    expect(route).toContain("export async function DELETE");
    expect(route).toContain("pushSubscription.deleteMany");
  });
});
