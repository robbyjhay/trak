import { describe, expect, test } from "vitest";
import {
  APP_RECOVERY_NOTIFICATION,
  APP_RECOVERY_ICON_PATH,
  APP_RECOVERY_NOTIFICATION_ID,
  APP_RECOVERY_NOTIFICATION_TYPE,
} from "@/lib/appRecoveryNotification";

describe("App Recovery hardcoded system notification", () => {
  test("the recovery notification is always present (hardcoded, not DB-backed)", () => {
    expect(APP_RECOVERY_NOTIFICATION).toBeDefined();
    expect(APP_RECOVERY_NOTIFICATION.id).toBe(APP_RECOVERY_NOTIFICATION_ID);
    expect(APP_RECOVERY_NOTIFICATION.type).toBe(APP_RECOVERY_NOTIFICATION_TYPE);
    expect(APP_RECOVERY_NOTIFICATION.text.length).toBeGreaterThan(0);
    expect(APP_RECOVERY_ICON_PATH.length).toBeGreaterThan(0);
  });

  test("its message communicates TRAK is back, apologizes, cites a DB issue, and pledges prevention", () => {
    const t = APP_RECOVERY_NOTIFICATION.text.toLowerCase();
    expect(t).toContain("back");
    expect(t).toContain("apolog");
    expect(t).toContain("database");
    expect(t).toContain("prevent");
  });

  test("has a stable distinct type/identifier for easy updates or removal", () => {
    expect(APP_RECOVERY_NOTIFICATION_ID).toMatch(/^app-recovery-/);
    expect(APP_RECOVERY_NOTIFICATION_TYPE).toBe("app_recovery");
  });

  test("is not a database NotifType (never persisted per user)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const types = readFileSync(join(process.cwd(), "src/lib/types.ts"), "utf8");
    // The recovery type should not be added to the persisted NotifType union.
    expect(types).not.toMatch(/NotifType\b[\s\S]*?app_recovery/);
  });
});

describe("App Recovery pinning in the notification panel", () => {
  test("the panel renders the recovery notice before the normal notification list", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const topbar = readFileSync(join(process.cwd(), "src/components/shell/Topbar.tsx"), "utf8");
    const recoveryIdx = topbar.indexOf("APP_RECOVERY_NOTIFICATION.text");
    const listIdx = topbar.indexOf("notifs.map");
    expect(recoveryIdx).toBeGreaterThan(-1);
    expect(listIdx).toBeGreaterThan(recoveryIdx);
  });

  test("normal notifications still render underneath (their list remains present)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const topbar = readFileSync(join(process.cwd(), "src/components/shell/Topbar.tsx"), "utf8");
    expect(topbar).toContain("notifs.map((n)");
    expect(topbar).toContain("markNotifRead(n.id)");
  });
});
