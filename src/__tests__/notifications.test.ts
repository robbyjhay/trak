import { describe, expect, test } from "vitest";
import {
  NOTIFICATION_TAXONOMY,
  prefAllowsPush,
  resolvePushContent,
} from "@/lib/notificationPolicy";
import type { NotifType } from "@/lib/types";

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
