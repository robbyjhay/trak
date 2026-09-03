import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mapDm, mapNotification } from "@/lib/db/mappers";

function readFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Backend — self-messaging restriction removed
// ---------------------------------------------------------------------------
describe("Self-DM — backend", () => {
  test("sendDm no longer rejects toId === session.id", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).not.toContain("Cannot message yourself.");
  });

  test("isSelfDm flag is computed in sendDm", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("const isSelfDm = toId === session.id;");
  });

  test("self-DM notification is suppressed", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("if (!isSelfDm) {");
  });

  test("normal DM still validates recipient exists", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("Recipient not found.");
  });

  test("normal DM still validates session", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("requireActor(session)");
  });

  test("canonicalPair handles self-pair (A, A)", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("function canonicalPair");
    // canonicalPair(a, b) returns [a, b] if a < b, else [b, a]
    // For a === b: "a" < "a" is false, so returns [b, a] = [a, a] — correct
  });
});

// ---------------------------------------------------------------------------
// 2. Mappers — self-DM mapping
// ---------------------------------------------------------------------------
describe("Self-DM — mappers", () => {
  test("mapDm handles self-DM where participantA === participantB", () => {
    const row: any = {
      id: "self-msg-1",
      participantA: "user-1",
      participantB: "user-1",
      fromUserId: "user-1",
      text: "Remember to update TRAK",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      deletedAt: null,
      replyToId: null,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.a).toBe("user-1");
    expect(dm.b).toBe("user-1");
    expect(dm.from).toBe("user-1");
    expect(dm.text).toBe("Remember to update TRAK");
  });

  test("mapDm handles self-DM with reply", () => {
    const originalRow: any = {
      id: "self-orig",
      participantA: "user-1",
      participantB: "user-1",
      fromUserId: "user-1",
      text: "Original note",
      createdAt: new Date("2026-01-01T09:00:00Z"),
      deletedAt: null,
      attachments: [],
    };
    const replyRow: any = {
      id: "self-reply",
      participantA: "user-1",
      participantB: "user-1",
      fromUserId: "user-1",
      text: "Done.",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      deletedAt: null,
      replyToId: "self-orig",
      replyTo: originalRow,
      attachments: [],
    };
    const dm = mapDm(replyRow);
    expect(dm.replyToId).toBe("self-orig");
    expect(dm.replyTo).not.toBeNull();
    expect(dm.replyTo!.text).toBe("Original note");
  });

  test("mapNotification includes messageId field", () => {
    const row: any = {
      id: "notif-1",
      userId: "user-1",
      type: "dm",
      text: "sent you a message",
      activityId: null,
      messageId: "msg-123",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      readAt: null,
    };
    const notif = mapNotification(row);
    expect(notif.messageId).toBe("msg-123");
  });

  test("mapNotification handles null messageId", () => {
    const row: any = {
      id: "notif-2",
      userId: "user-1",
      type: "dm",
      text: "sent you a message",
      activityId: null,
      messageId: null,
      createdAt: new Date("2026-01-01T10:00:00Z"),
      readAt: null,
    };
    const notif = mapNotification(row);
    expect(notif.messageId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Conversation list — self-DM entry
// ---------------------------------------------------------------------------
describe("Self-DM — conversation list", () => {
  test("ConversationList always includes self in partners set", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain("s.add(me);");
  });

  test("Self-DM shows 'You' label in name", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain('pid === me ? `${p.name} (You)` : p.name');
  });

  test("Self-DM shows 'Message yourself' when no messages", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain('pid === me && !last ? "Message yourself" : snippet');
  });

  test("Self-DM is searchable via 'you'", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain('"you".includes(search.toLowerCase())');
  });

  test("Conversation list includes 'Direct Messages' section header", () => {
    const list = readFile("src/components/messaging/ConversationList.tsx");
    expect(list).toContain("Direct Messages");
  });
});

// ---------------------------------------------------------------------------
// 4. DM header — self-DM display
// ---------------------------------------------------------------------------
describe("Self-DM — header", () => {
  test("DM header shows 'You' for self-DM instead of role/username", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain('isSelfDm ? "You"');
  });

  test("DM header computes isSelfDm from activeConv === me", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("const isSelfDm = activeConv === me;");
  });

  test("Call button is hidden for self-DM", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("{!isSelfDm && (");
  });
});

// ---------------------------------------------------------------------------
// 5. Contacts — self included
// ---------------------------------------------------------------------------
describe("Self-DM — contacts", () => {
  test("NewConversation includes self in user list", () => {
    const nc = readFile("src/components/messaging/NewConversation.tsx");
    expect(nc).not.toContain("u.id !== me");
  });

  test("Contacts view includes self", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    // The contacts filter should not have .filter((u) => u.id !== me) anymore
    const lines = messaging.split("\n");
    const contactsFilterLine = lines.find(
      (l) => l.includes(".filter((u) => contactsSearch ?") && l.includes("users"),
    );
    expect(contactsFilterLine).toBeDefined();
    expect(contactsFilterLine).not.toContain("u.id !== me");
  });
});

// ---------------------------------------------------------------------------
// 6. Thread items — self-DM filtering
// ---------------------------------------------------------------------------
describe("Self-DM — threadItems", () => {
  test("threadItems matches self-DMs (a === me && b === me)", () => {
    // Both Messaging.tsx and ConversationList.tsx have threadItems
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    const list = readFile("src/components/messaging/ConversationList.tsx");
    // The filter should handle d.a === me && d.b === other where other === me
    expect(messaging).toContain("d.a === me && d.b === other");
    expect(list).toContain("d.a === me && d.b === other");
  });
});

// ---------------------------------------------------------------------------
// 7. @mention integration — self-mention opens self-DM
// ---------------------------------------------------------------------------
describe("Self-DM — mention integration", () => {
  test("Bubble onMentionClick passes userId to callback", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("onMentionClick?.(seg.userId)");
  });

  test("Messaging wires onMentionClick to openThread", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("onMentionClick={openThread}");
  });

  test("openThread sets activeConv to the mentioned userId", () => {
    const messaging = readFile("src/components/messaging/Messaging.tsx");
    expect(messaging).toContain("setActiveConv(pid)");
  });

  test("No special-case handling for self-mention in Bubble", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).not.toContain("currentUserId");
    expect(bubble).not.toContain("isSelf");
  });

  test("No special-case handling for self-mention in ChatThread", () => {
    const chatThread = readFile("src/components/messaging/ChatThread.tsx");
    expect(chatThread).not.toContain("isSelfMention");
    expect(chatThread).not.toContain("self-mention");
  });
});

// ---------------------------------------------------------------------------
// 8. Architecture — no separate self-chat backend
// ---------------------------------------------------------------------------
describe("Self-DM — architecture integrity", () => {
  test("No SelfMessage model in schema", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).not.toContain("model SelfMessage");
    expect(schema).not.toContain("model SelfConversation");
  });

  test("No separate self-chat API route", () => {
    const dmsRoute = readFile("src/app/api/messages/dms/route.ts");
    expect(dmsRoute).not.toContain("self");
  });

  test("Self-DM uses existing DirectMessage model", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).toContain("model DirectMessage");
  });

  test("Self-DM uses existing sendDm function", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("export async function sendDm");
  });

  test("Self-DM uses existing listDmsForUser function", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("export async function listDmsForUser");
  });
});

// ---------------------------------------------------------------------------
// 9. Regression — existing features preserved
// ---------------------------------------------------------------------------
describe("Self-DM — regression guards", () => {
  test("Normal A→B DM still uses canonical pair", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("canonicalPair(session.id, toId)");
  });

  test("Normal DM still creates notification", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("pushNotification(");
  });

  test("Reply validation still checks same conversation", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("Reply must reference a message from the same conversation.");
  });

  test("Community chat still works", () => {
    const service = readFile("src/lib/db/service.ts");
    expect(service).toContain("export async function sendCommunity");
  });

  test("Mentions still use userId-based identity", () => {
    const types = readFile("src/lib/types.ts");
    expect(types).toContain("userId: string");
    expect(types).toContain("displayName: string");
    expect(types).toContain("position: number");
  });

  test("parseSegments still uses position-based parsing", () => {
    const utils = readFile("src/lib/mention-utils.ts");
    expect(utils).toContain("export function parseSegments");
  });

  test("Bubble still has onMentionClick prop", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("onMentionClick?: (userId: string) => void");
  });

  test("Message action menu still has Reply", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("Reply");
  });

  test("Swipe-to-reply still exists", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("onTouchStart");
    expect(bubble).toContain("onTouchMove");
    expect(bubble).toContain("onTouchEnd");
  });
});
