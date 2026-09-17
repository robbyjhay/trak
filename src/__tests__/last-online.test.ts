import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { formatLastOnline } from "@/lib/presence";
import { mapUser } from "@/lib/db/mappers";

function readFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1. formatLastOnline — pure formatting logic
// ---------------------------------------------------------------------------
describe("Last online — formatLastOnline", () => {
  // Wed Jul 15, 2026 12:00 local.
  const now = new Date(2026, 6, 15, 12, 0, 0);

  test("null/undefined renders a fallback", () => {
    expect(formatLastOnline(null, now)).toBe("Last seen recently");
    expect(formatLastOnline(undefined, now)).toBe("Last seen recently");
  });

  test("invalid date renders a fallback", () => {
    expect(formatLastOnline("not-a-date", now)).toBe("Last seen recently");
  });

  test("just disconnected (<60s) shows 'recently' like WhatsApp", () => {
    expect(formatLastOnline(new Date(2026, 6, 15, 11, 59, 30).toISOString(), now)).toBe(
      "Last seen recently",
    );
  });

  test("same calendar day shows the actual time", () => {
    expect(
      formatLastOnline(new Date(2026, 6, 15, 9, 15).toISOString(), now),
    ).toBe("Last seen today at 9:15 AM");
  });

  test("yesterday shows the day and actual time", () => {
    expect(
      formatLastOnline(new Date(2026, 6, 14, 22, 5).toISOString(), now),
    ).toBe("Last seen yesterday at 10:05 PM");
  });

  test("within the past week shows the weekday and actual time", () => {
    // Sat Jul 11 2026 = 4 days before the Wed Jul 15, 2026 reference.
    expect(
      formatLastOnline(new Date(2026, 6, 11, 8, 0).toISOString(), now),
    ).toBe("Last seen Saturday at 8:00 AM");
  });

  test("older in the current year shows the month + day and time", () => {
    expect(
      formatLastOnline(new Date(2026, 2, 5, 14, 30).toISOString(), now),
    ).toBe("Last seen Mar 5 at 2:30 PM");
  });

  test("previous year includes the year", () => {
    expect(
      formatLastOnline(new Date(2025, 2, 5, 9, 0).toISOString(), now),
    ).toBe("Last seen Mar 5, 2025 at 9:00 AM");
  });

  test("future timestamps never produce a negative result", () => {
    expect(
      formatLastOnline(new Date(2026, 6, 15, 12, 5, 0).toISOString(), now),
    ).toBe("Last seen recently");
  });
});

// ---------------------------------------------------------------------------
// 2. Backend — persistence
// ---------------------------------------------------------------------------
describe("Last online — backend", () => {
  test("User schema exposes lastSeenAt column", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).toContain("lastSeenAt");
    expect(schema).toContain("DateTime?");
    expect(schema).toContain('@map("last_seen_at")');
  });

  test("migration adds last_seen_at column", () => {
    const migration = readFile(
      "prisma/migrations/20260913160000_add_user_last_seen/migration.sql",
    );
    expect(migration).toContain('ALTER TABLE "users"');
    expect(migration).toContain('ADD COLUMN "last_seen_at"');
  });

  test("backfill migration seeds last_seen_at from last_login_at", () => {
    const backfill = readFile(
      "prisma/migrations/20260913170000_backfill_user_last_seen/migration.sql",
    );
    expect(backfill).toContain('"last_seen_at" = "last_login_at"');
  });

  test("server persists lastSeenAt on connect", () => {
    const server = readFile("server.ts");
    expect(server).toContain("persistLastSeen(userId, new Date(), true)");
  });

  test("server refreshes lastSeenAt on ping (throttled)", () => {
    const server = readFile("server.ts");
    expect(server).toContain("void persistLastSeen(userId);");
    expect(server).toContain("LAST_SEEN_PERSIST_INTERVAL_MS");
  });

  test("server broadcasts user_offline with lastSeenAt", () => {
    const server = readFile("server.ts");
    expect(server).toContain('type: "user_offline"');
    expect(server).toContain("lastSeenAt: closedAt.toISOString()");
  });

  test("signaling types carry lastSeenAt on user_offline", () => {
    const types = readFile("src/lib/signaling-types.ts");
    expect(types).toContain('{ type: "user_offline"; userId: string; lastSeenAt?: string }');
  });
});

// ---------------------------------------------------------------------------
// 3. Mapper — lastSeenAt surfaced to client
// ---------------------------------------------------------------------------
describe("Last online — mapper", () => {
  test("mapUser maps lastSeenAt to ISO string when set", () => {
    const row: any = {
      id: "user-1",
      username: "ali",
      usernameNormalized: "ali",
      email: "ali@example.com",
      passwordHash: "hash",
      role: "member",
      isSecretary: false,
      isCorps: true,
      isIntern: false,
      mustChangePassword: false,
      emailVerifiedAt: null,
      isActive: true,
      lastLoginAt: null,
      lastSeenAt: new Date("2026-01-01T10:05:00Z"),
      createdAt: new Date("2026-01-01T09:00:00Z"),
      updatedAt: new Date("2026-01-01T09:00:00Z"),
      profile: null,
    };
    const u = mapUser(row);
    expect(u.lastSeenAt).toBe("2026-01-01T10:05:00.000Z");
  });

  test("mapUser maps lastSeenAt to null when never seen", () => {
    const row: any = {
      id: "user-2",
      username: "b",
      usernameNormalized: "b",
      email: null,
      passwordHash: "hash",
      role: "member",
      isSecretary: false,
      isCorps: false,
      isIntern: false,
      mustChangePassword: false,
      emailVerifiedAt: null,
      isActive: true,
      lastLoginAt: null,
      lastSeenAt: null,
      createdAt: new Date("2026-01-01T09:00:00Z"),
      updatedAt: new Date("2026-01-01T09:00:00Z"),
      profile: null,
    };
    expect(mapUser(row).lastSeenAt).toBeNull();
  });

  test("client User type exposes lastSeenAt", () => {
    const types = readFile("src/lib/types.ts");
    expect(types).toContain("lastSeenAt");
  });
});

// ---------------------------------------------------------------------------
// 4. Frontend — store + UI integration
// ---------------------------------------------------------------------------
describe("Last online — frontend", () => {
  test("TrakStore captures lastSeenAt on user_offline", () => {
    const store = readFile("src/context/TrakStore.tsx");
    expect(store).toContain('data.type === "user_offline"');
    expect(store).toContain("users[idx]!.lastSeenAt = data.lastSeenAt");
  });

  test("DM header renders last-online text for offline users", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("formatLastOnline(p.lastSeenAt, new Date(now))");
  });

  test("DM header still shows 'Online' for online users", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain('? "Online"');
  });

  test("Conversation list dot carries a last-seen tooltip", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain("lastSeenTitle");
    expect(list).toContain('title={isOnline ? "Online" : lastSeenTitle}');
  });

  test("useNow hook ticks for fresh relative labels", () => {
    const hook = readFile("src/hooks/useNow.ts");
    expect(hook).toContain("export function useNow");
    expect(hook).toContain("setInterval");
  });
});