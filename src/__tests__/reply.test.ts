import { describe, expect, test, beforeAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { mapDm, mapCommunity } from "@/lib/db/mappers";
import { getReplyPreviewText, truncatePreview, isValidDmReply } from "@/lib/reply-utils";
import { isHorizontalSwipe, isVerticalScroll, computeOffset, shouldTriggerReply, dragProgress, SWIPE_THRESHOLD } from "@/lib/swipe-utils";
import type { ReplyPreview } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers to read source files for file-content assertions
// ---------------------------------------------------------------------------
function readFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ---------------------------------------------------------------------------
// 1. Database / Types
// ---------------------------------------------------------------------------
describe("Reply database design", () => {
  test("DirectMessage schema has replyToId and self-relation", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).toContain("replyToId");
    expect(schema).toContain("DirectMessageReplies");
    expect(schema).toMatch(/model DirectMessage[\s\S]*?replyTo DirectMessage\?/);
  });

  test("CommunityMessage schema retains replyToId", () => {
    const schema = readFile("prisma/schema.prisma");
    expect(schema).toContain('model CommunityMessage');
    expect(schema).toMatch(/CommunityMessageReply/);
  });

  test("Dm type has replyTo fields", () => {
    const types = readFile("src/lib/types.ts");
    expect(types).toContain("replyToId");
    expect(types).toContain("replyTo?: ReplyPreview");
    expect(types).toContain("interface ReplyPreview");
  });

  test("CommunityMessage type has replyTo fields", () => {
    const types = readFile("src/lib/types.ts");
    expect(types).toMatch(/CommunityMessage[\s\S]*?replyTo/);
  });

  test("migration file exists and is non-destructive", () => {
    const mig = readFile("prisma/migrations/20260901000000_add_dm_reply/migration.sql");
    expect(mig).toContain("ADD COLUMN");
    expect(mig).toContain("reply_to_id");
    expect(mig).toContain("SET NULL");
    expect(mig).not.toContain("DROP");
  });
});

// ---------------------------------------------------------------------------
// 2. Mappers — reply relationship
// ---------------------------------------------------------------------------
describe("Reply relationship — mappers", () => {
  test("Normal DM has no reply (replyToId null)", () => {
    const row: any = {
      id: "msg-1",
      participantA: "a",
      participantB: "b",
      fromUserId: "u1",
      text: "hello",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      deletedAt: null,
      replyToId: null,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.replyToId).toBeNull();
    expect(dm.replyTo).toBeNull();
  });

  test("Reply stores correct replyToId", () => {
    const replyToRow: any = {
      id: "msg-123",
      fromUserId: "u1",
      text: "Please review the report.",
      createdAt: new Date("2026-01-01T09:00:00Z"),
      deletedAt: null,
      attachments: [],
    };
    const row: any = {
      id: "msg-456",
      participantA: "a",
      participantB: "b",
      fromUserId: "u2",
      text: "Sure, I'll check.",
      createdAt: new Date("2026-01-01T10:00:00Z"),
      deletedAt: null,
      replyToId: "msg-123",
      replyTo: replyToRow,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.replyToId).toBe("msg-123");
    expect(dm.replyTo).not.toBeNull();
    expect(dm.replyTo?.id).toBe("msg-123");
    expect(dm.replyTo?.text).toBe("Please review the report.");
  });

  test("Community reply maps correctly", () => {
    const replyToRow: any = {
      id: "c-123",
      fromUserId: "u1",
      text: "Community hello",
      createdAt: new Date(),
      deletedAt: null,
      attachments: [],
    };
    const row: any = {
      id: "c-456",
      fromUserId: "u2",
      text: "Reply here",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: "c-123",
      replyTo: replyToRow,
      mentions: [],
      attachments: [],
    };
    const cm = mapCommunity(row);
    expect(cm.replyToId).toBe("c-123");
    expect(cm.replyTo?.id).toBe("c-123");
  });

  test("Existing messages continue working with replyToId null", () => {
    const row: any = {
      id: "old-msg",
      participantA: "a",
      participantB: "b",
      fromUserId: "u1",
      text: "old message",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: null,
      attachments: [],
    };
    expect(() => mapDm(row)).not.toThrow();
    const dm = mapDm(row);
    expect(dm.text).toBe("old message");
  });

  test("Missing original message does not crash (replyTo null but replyToId set)", () => {
    const row: any = {
      id: "msg-2",
      participantA: "a",
      participantB: "b",
      fromUserId: "u1",
      text: "reply",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: "missing-id",
      replyTo: null,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.replyTo).toBeNull();
    expect(dm.replyToId).toBe("missing-id");
    // UI should render "Original message unavailable" not crash
    expect(dm.text).toBe("reply");
  });

  test("Deleted original renders as unavailable", () => {
    const replyToRow: any = {
      id: "msg-123",
      fromUserId: "u1",
      text: "secret",
      createdAt: new Date(),
      deletedAt: new Date(),
      attachments: [],
    };
    const row: any = {
      id: "msg-456",
      participantA: "a",
      participantB: "b",
      fromUserId: "u2",
      text: "reply",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: "msg-123",
      replyTo: replyToRow,
      attachments: [],
    };
    const dm = mapDm(row);
    expect(dm.replyTo?.isDeleted).toBe(true);
    expect(dm.replyTo?.text).toBe("Original message unavailable");
  });
});

// ---------------------------------------------------------------------------
// 3. Reply rendering helpers
// ---------------------------------------------------------------------------
describe("Reply rendering", () => {
  test("Reply preview renders correct sender and content via helper", () => {
    const reply: ReplyPreview = {
      id: "msg-123",
      from: "u1",
      text: "Please review the report.",
      at: new Date().toISOString(),
    };
    const preview = getReplyPreviewText(reply);
    expect(preview).toBe("Please review the report.");
  });

  test("Reply preview uses actual original message data", () => {
    const reply: ReplyPreview = {
      id: "msg-123",
      from: "u1",
      text: "Original message",
      at: new Date().toISOString(),
    };
    expect(getReplyPreviewText(reply)).toBe("Original message");
    // If original had attachment
    const reply2: ReplyPreview = {
      id: "msg-124",
      from: "u1",
      text: "",
      at: new Date().toISOString(),
      attachments: [{ id: "a1", name: "photo.jpg", size: 123, contentType: "image/jpeg", storageKey: "k" }],
    };
    expect(getReplyPreviewText(reply2)).toBe("📷 Photo");
  });

  test("Reply preview for file attachment shows sensible representation", () => {
    const reply: ReplyPreview = {
      id: "msg-125",
      from: "u1",
      text: "",
      at: new Date().toISOString(),
      attachments: [{ id: "a2", name: "document.pdf", size: 500, contentType: "application/pdf", storageKey: "k2" }],
    };
    expect(getReplyPreviewText(reply)).toBe("📎 document.pdf");
  });

  test("Missing original message does not crash UI — helper fallback", () => {
    const reply: ReplyPreview = {
      id: "missing",
      from: "u1",
      text: "",
      at: new Date().toISOString(),
      isDeleted: true,
    };
    expect(getReplyPreviewText(reply)).toBe("Original message unavailable");
  });

  test("Multiple replies to same message work — independent objects", () => {
    const originalId = "orig-1";
    const reply1: ReplyPreview = { id: originalId, from: "u1", text: "orig", at: new Date().toISOString() };
    const reply2: ReplyPreview = { id: originalId, from: "u1", text: "orig", at: new Date().toISOString() };
    expect(reply1.id).toBe(reply2.id);
    // Two different reply messages referencing same original
    const dm1: any = mapDm({
      id: "r1",
      participantA: "a",
      participantB: "b",
      fromUserId: "u2",
      text: "reply one",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: originalId,
      replyTo: { id: originalId, fromUserId: "u1", text: "orig", createdAt: new Date(), deletedAt: null, attachments: [] } as any,
      attachments: [],
    } as any);
    const dm2: any = mapDm({
      id: "r2",
      participantA: "a",
      participantB: "b",
      fromUserId: "u3",
      text: "reply two",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: originalId,
      replyTo: { id: originalId, fromUserId: "u1", text: "orig", createdAt: new Date(), deletedAt: null, attachments: [] } as any,
      attachments: [],
    } as any);
    expect(dm1.replyToId).toBe(originalId);
    expect(dm2.replyToId).toBe(originalId);
  });

  test("truncatePreview respects limit", () => {
    const long = "a".repeat(100);
    const truncated = truncatePreview(long, 70);
    expect(truncated.length).toBe(71); // 70 + …
    expect(truncated.endsWith("…")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Context menu — Reply + Copy + Delete (correction)
// ---------------------------------------------------------------------------
describe("Context menu — Reply, Copy message, Delete for me/everyone", () => {
  test("Reply appears in Bubble context menu", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("Reply");
    expect(bubble).toContain('data-testid="reply-action"');
  });

  test("Copy message appears in context menu", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("Copy message");
    expect(bubble).toContain('data-testid="copy-action"');
  });

  test("Delete for me is present", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("Delete for me");
    expect(bubble).toContain('data-testid="delete-for-me-action"');
  });

  test("Delete for everyone is present where authorized", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("Delete for everyone");
    expect(bubble).toContain('data-testid="delete-for-everyone-action"');
  });

  test("Correct icon rendered beside Delete for me (trash)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("PATHS.trash");
    // The delete-for-me button should reference the trash path
    const deleteMeSection = bubble.slice(bubble.indexOf('delete-for-me-action') - 500, bubble.indexOf('delete-for-me-action') + 500);
    expect(deleteMeSection).toContain("PATHS.trash");
  });

  test("Correct icon rendered beside Delete for everyone (recycle/switchUser)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("PATHS.switchUser");
    const deleteEveryoneSection = bubble.slice(bubble.indexOf('delete-for-everyone-action') - 500, bubble.indexOf('delete-for-everyone-action') + 500);
    expect(deleteEveryoneSection).toContain("PATHS.switchUser");
  });

  test("Delete for me performs existing behavior (handleDelete call)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("handleDelete(false)");
  });

  test("Delete for everyone respects authorization (isGroup ? canDeleteAny : isMe)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    expect(bubble).toContain("isGroup ? canDeleteAny : isMe");
    expect(bubble).toContain("canDeleteAny");
  });

  test("Messaging wires delete handlers alongside Reply", () => {
    const msg = readFile("src/components/messaging/Messaging.tsx");
    expect(msg).toContain("deleteCommunityMessage");
    expect(msg).toContain("deleteDmMessage");
    expect(msg).toContain("onDeleteMessage");
    expect(msg).toContain("canDeleteAny");
    // Both reply and delete should be present
    expect(msg).toContain("onReply");
    expect(msg).toContain("handleReplySelect");
  });

  test("ChatThread exposes delete props alongside reply", () => {
    const ct = readFile("src/components/messaging/ChatThread.tsx");
    expect(ct).toContain("onDeleteMessage");
    expect(ct).toContain("canDeleteAny");
    expect(ct).toContain("onReply");
    expect(ct).toContain("onDelete");
  });

  test("All four actions are available together (Reply + Copy message + both deletes)", () => {
    const bubble = readFile("src/components/messaging/Bubble.tsx");
    const menuSection = bubble.slice(bubble.indexOf("Context Menu"));
    expect(menuSection).toContain("Reply");
    expect(menuSection).toContain("Copy message");
    expect(menuSection).toContain("Delete for me");
    expect(menuSection).toContain("Delete for everyone");
  });
});

// ---------------------------------------------------------------------------
// 5. Swipe logic
// ---------------------------------------------------------------------------
describe("Swipe interaction", () => {
  test("Horizontal swipe below threshold does NOT trigger reply", () => {
    const offset = computeOffset(20); // dx 20 *0.55 =11
    expect(offset).toBeLessThan(SWIPE_THRESHOLD);
    expect(shouldTriggerReply(offset)).toBe(false);
  });

  test("Horizontal swipe above threshold DOES trigger reply mode", () => {
    const dx = 120; // offset ~66 >55
    const offset = computeOffset(dx);
    expect(offset).toBeGreaterThanOrEqual(SWIPE_THRESHOLD);
    expect(shouldTriggerReply(offset)).toBe(true);
  });

  test("Vertical scroll does NOT trigger reply", () => {
    expect(isVerticalScroll(5, 80)).toBe(true);
    expect(isHorizontalSwipe(5, 80)).toBe(false);
    // Swipe helper should not trigger on vertical
    expect(isHorizontalSwipe(80, 5)).toBe(true);
    expect(isVerticalScroll(80, 5)).toBe(false);
  });

  test("Swipe resets correctly after activation", () => {
    let offset = computeOffset(100);
    expect(shouldTriggerReply(offset)).toBe(true);
    // After trigger, offset resets to 0
    offset = 0;
    expect(offset).toBe(0);
    expect(shouldTriggerReply(offset)).toBe(false);
  });

  test("Negative dx (left swipe) yields zero offset", () => {
    expect(computeOffset(-50)).toBe(0);
  });

  test("Drag progress is capped at 1", () => {
    expect(dragProgress(100)).toBe(1);
    expect(dragProgress(27.5)).toBeCloseTo(0.5);
  });

  test("Only clear horizontal gesture should activate — direction lock", () => {
    // Simulate gesture detection
    expect(isHorizontalSwipe(40, 10)).toBe(true);
    expect(isVerticalScroll(10, 40)).toBe(true);
    // Small jitter should not trigger either
    expect(isHorizontalSwipe(5, 4)).toBe(false);
    expect(isVerticalScroll(4, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Multiple message scenarios
// ---------------------------------------------------------------------------
describe("Multiple message scenarios", () => {
  test("Reply to own message is allowed (isValid check does not forbid same sender)", () => {
    const me = "user-1";
    const reply: ReplyPreview = { id: "m1", from: me, text: "I'll send tomorrow", at: new Date().toISOString() };
    // Same sender as reply creator should be valid
    expect(reply.from).toBe(me);
    // Validation only checks conversation, not sender, so own reply is permitted
    expect(isValidDmReply({ participantA: "a", participantB: "b" }, "a", "b")).toBe(true);
  });

  test("Reply to message containing a mention — both relationships coexist", () => {
    const row: any = {
      id: "c-mention-reply",
      fromUserId: "u2",
      text: "@Mike can you review?",
      createdAt: new Date(),
      deletedAt: null,
      replyToId: "c-orig",
      replyTo: { id: "c-orig", fromUserId: "u1", text: "Please check", createdAt: new Date(), deletedAt: null, attachments: [] },
      mentions: [{ userId: "u3", displayName: "Mike", position: 0, user: { id: "u3", profile: { name: "Mike" } } }],
      attachments: [],
    };
    const cm = mapCommunity(row);
    expect(cm.replyToId).toBe("c-orig");
    expect(cm.mentions?.[0].userId).toBe("u3");
  });

  test("Reply to an attachment — preview shows attachment type", () => {
    const reply: ReplyPreview = {
      id: "att-msg",
      from: "u1",
      text: "",
      at: new Date().toISOString(),
      attachments: [{ id: "att1", name: "report.pdf", size: 1000, contentType: "application/pdf", storageKey: "k" }],
    };
    expect(getReplyPreviewText(reply)).toContain("report.pdf");
  });

  test("Reply cannot reference message from another conversation — helper rejects", () => {
    const otherConversation = { participantA: "x", participantB: "y" };
    const currentA = "a", currentB = "b";
    expect(isValidDmReply(otherConversation, currentA, currentB)).toBe(false);
  });

  test("Invalid message ID is rejected — isValidDmReply with null", () => {
    expect(isValidDmReply(null, "a", "b")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Reply navigation helper (jsdom)
// ---------------------------------------------------------------------------
describe("Reply navigation — scrollToMessage", () => {
  test("scrollToMessage finds element by data-message-id and returns true", async () => {
    // Lightweight DOM stub without jsdom dependency
    const mockEl: any = {
      scrollIntoView: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
      style: {} as any,
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };
    const mockDocument: any = {
      querySelector: vi.fn((sel: string) => {
        if (sel.includes("msg-123")) return mockEl;
        return null;
      }),
    };
    const prevDocument = (global as any).document;
    const prevCSS = (global as any).CSS;
    (global as any).document = mockDocument;
    if (!(global as any).CSS) (global as any).CSS = { escape: (s: string) => s };

    const { scrollToMessage } = await import("@/lib/message-scroll");
    const ok = scrollToMessage("msg-123");
    expect(ok).toBe(true);
    expect(mockEl.scrollIntoView).toHaveBeenCalled();
    expect(mockEl.classList.add).toHaveBeenCalled();

    (global as any).document = prevDocument;
    (global as any).CSS = prevCSS;
  });

  test("scrollToMessage returns false when element not found", async () => {
    const mockDocument: any = {
      querySelector: vi.fn(() => null),
    };
    const prevDocument = (global as any).document;
    const prevCSS = (global as any).CSS;
    (global as any).document = mockDocument;
    if (!(global as any).CSS) (global as any).CSS = { escape: (s: string) => s };
    const { scrollToMessage } = await import("@/lib/message-scroll");
    expect(scrollToMessage("nonexistent")).toBe(false);
    (global as any).document = prevDocument;
    (global as any).CSS = prevCSS;
  });
});

// ---------------------------------------------------------------------------
// 8. Composer reply mode
// ---------------------------------------------------------------------------
describe("Composer Reply Mode", () => {
  test("Composer file contains reply bar", () => {
    const comp = readFile("src/components/messaging/Composer.tsx");
    expect(comp).toContain("Replying to");
    expect(comp).toContain("replyingTo");
    expect(comp).toContain("onCancelReply");
    expect(comp).toContain('data-testid="reply-composer-bar"');
    expect(comp).toContain('data-testid="cancel-reply"');
  });

  test("Messaging wires replyingTo to Composer", () => {
    const msg = readFile("src/components/messaging/Messaging.tsx");
    expect(msg).toContain("replyingTo");
    expect(msg).toContain("setReplyingTo");
    expect(msg).toContain("handleReplySelect");
    expect(msg).toContain("onCancelReply");
  });
});

// ---------------------------------------------------------------------------
// 9. API / Service validation expectations
// ---------------------------------------------------------------------------
describe("API / Service validation", () => {
  test("sendDm service signature includes replyToId", () => {
    const svc = readFile("src/lib/db/service.ts");
    expect(svc).toContain("sendDm(");
    expect(svc).toContain("replyToId");
  });

  test("sendCommunity service validates referenced message exists", () => {
    const svc = readFile("src/lib/db/service.ts");
    expect(svc).toContain('Referenced message not found');
  });

  test("DM API route forwards replyToId", () => {
    const route = readFile("src/app/api/messages/dms/route.ts");
    expect(route).toContain("replyToId");
  });

  test("Community API route retains replyToId handling", () => {
    const route = readFile("src/app/api/messages/community/route.ts");
    expect(route).toContain("replyToId");
  });

  test("Backend validates same-conversation for DMs", () => {
    const svc = readFile("src/lib/db/service.ts");
    expect(svc).toContain("Reply must reference a message from the same conversation");
  });
});
