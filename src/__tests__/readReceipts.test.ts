import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mapDm } from "@/lib/db/mappers";

function readFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Backend — read-receipt persistence
// ---------------------------------------------------------------------------
describe("Read receipts — backend", () => {
  test("DirectMessage schema has readAt column", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).toContain("readAt");
    expect(schema).toContain("DateTime?");
  });

  test("migration sets read_at column on direct_messages", () => {
    const migration = readFile(
      "prisma/migrations/20260913150000_add_dm_read_receipts/migration.sql",
    );
    expect(migration).toContain("ALTER TABLE \"direct_messages\"");
    expect(migration).toContain("ADD COLUMN \"read_at\"");
  });

  test("sendDm marks self-DM as read at send time", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("readAt: isSelfDm ? new Date() : null");
  });

  test("markDmsRead service exists", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("export async function markDmsRead");
  });

  test("markDmsRead only marks incoming messages from the other party", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("fromUserId: withUserId");
    expect(service).toContain("readAt: null");
  });

  test("markDmsRead notifies the sender via realtime", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("sendToUser(withUserId");
    expect(service).toContain('type: "dm_read"');
  });

  test("markDmsRead returns authoritative dms list for reconciliation", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("listDmsForUser(session");
  });

  test("read API route exists and validates withUserId", () => {
    const route = readFile("src/app/api/messages/dms/read/route.ts");
    expect(route).toContain("markDmsRead");
    expect(route).toContain("withUserId is required");
  });
});

// ---------------------------------------------------------------------------
// 2. Mappers — readAt mapping
// ---------------------------------------------------------------------------
describe("Read receipts — mappers", () => {
  test("mapDm maps readAt to ISO string when set", () => {
    const row: any = {
      id: "dm-1",
      participantA: "user-a",
      participantB: "user-b",
      fromUserId: "user-b",
      text: "Read this",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      readAt: new Date("2026-01-01T10:05:00Z"),
      deletedAt: null,
      replyToId: null,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.readAt).toBe("2026-01-01T10:05:00.000Z");
  });

  test("mapDm maps readAt to null when not set", () => {
    const row: any = {
      id: "dm-2",
      participantA: "user-a",
      participantB: "user-b",
      fromUserId: "user-a",
      text: "Unread",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      readAt: null,
      deletedAt: null,
      replyToId: null,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.readAt).toBeNull();
  });

  test("Dm type exposes readAt", () => {
    const types = readFile("src/lib/types.ts");
    expect(types).toContain("readAt");
  });
});

// ---------------------------------------------------------------------------
// 3. Frontend — store integration
// ---------------------------------------------------------------------------
describe("Read receipts — store", () => {
  test("TrakStore exposes markDmsRead", () => {
    const store = readFile("src/context/TrakStore.tsx");
    expect(store).toContain("markDmsRead: (withUserId: string) => Promise<void>");
    expect(store).toContain("markDmsRead: async (withUserId) => {");
  });

  test("sendDm optimistically marks self-DM read", () => {
    const store = readFile("src/context/TrakStore.tsx");
    expect(store).toContain("readAt: toId === session.id");
  });

  test("dm_read realtime event flips local readAt", () => {
    const store = readFile("src/context/TrakStore.tsx");
    expect(store).toContain('data.type === "dm_read"');
    expect(store).toContain("readDmIds");
  });
});

// ---------------------------------------------------------------------------
// 4. Frontend — UI integration
// ---------------------------------------------------------------------------
describe("Read receipts — UI", () => {
  test("Bubble renders a read-receipt label", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("ReadReceiptLabel");
    expect(bubble).toContain('{read ? "read" : "sent"}');
  });

  test("Label only renders on outgoing DMs (not groups, not deleted)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("isMe && !isGroup && !isDeleted");
  });

  test("Bubble accepts readAt prop", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("readAt?: string | null");
  });

  test("ChatThread passes readAt to Bubble", () => {
    const thread = readFile("src/components/messaging/ChatThread.tsx");
    expect(thread).toContain("readAt={(item.dm as any).readAt");
  });

  test("Messaging marks DMs read when a DM thread is open", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("hasUnreadIncoming");
    expect(messaging).toContain("markDmsRead(activeConv)");
  });

  test("Mark-read is skipped for community/announcements", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain('activeConv === "community"');
  });
});

// ---------------------------------------------------------------------------
// 5. Realtime signaling — dm_read type
// ---------------------------------------------------------------------------
describe("Read receipts — signaling", () => {
  test("IncomingMessage includes dm_read variant", () => {
    const types = readFile("src/lib/signaling-types.ts");
    expect(types).toContain('{ type: "dm_read"; from: string; readDmIds: string[]; at?: string }');
  });
});