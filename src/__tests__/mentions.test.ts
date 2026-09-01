import { describe, expect, test } from "vitest";
import { parseMentionQuery, insertMention } from "@/components/messaging/MentionAutocomplete";
import { parseSegments } from "@/lib/mention-utils";
import type { MessageMention } from "@/lib/types";

describe("parseMentionQuery", () => {
  test("returns null when no @ in text", () => {
    expect(parseMentionQuery("hello world", 10)).toBeNull();
  });

  test("returns null when @ is not at word boundary", () => {
    expect(parseMentionQuery("email@test.com", 10)).toBeNull();
  });

  test("detects @ at start of text", () => {
    const result = parseMentionQuery("@john", 5);
    expect(result).toEqual({ query: "john", start: 0 });
  });

  test("detects @ after space", () => {
    const result = parseMentionQuery("hello @john", 11);
    expect(result).toEqual({ query: "john", start: 6 });
  });

  test("detects @ after newline", () => {
    const result = parseMentionQuery("hello\n@john", 11);
    expect(result).toEqual({ query: "john", start: 6 });
  });

  test("returns null when @ is in middle of word", () => {
    expect(parseMentionQuery("foo@bar", 4)).toBeNull();
  });

  test("returns empty query for bare @", () => {
    const result = parseMentionQuery("@", 1);
    expect(result).toEqual({ query: "", start: 0 });
  });

  test("returns null when newline follows @ in query", () => {
    expect(parseMentionQuery("hello @\nworld", 8)).toBeNull();
  });

  test("handles cursor in middle of query", () => {
    const result = parseMentionQuery("@john doe", 5);
    expect(result).toEqual({ query: "john", start: 0 });
  });

  test("partial query works", () => {
    const result = parseMentionQuery("hello @jo", 9);
    expect(result).toEqual({ query: "jo", start: 6 });
  });
});

describe("insertMention", () => {
  test("inserts mention at start of text", () => {
    const result = insertMention("hello", 0, 0, { userId: "1", displayName: "John", position: 0 });
    expect(result.text).toBe("@John hello");
    expect(result.cursorPos).toBe(6);
  });

  test("inserts mention in middle of text replacing query", () => {
    const result = insertMention("hello @jo world", 6, 9, { userId: "1", displayName: "Jane", position: 6 });
    expect(result.text).toBe("hello @Jane  world");
    expect(result.cursorPos).toBe(12);
  });

  test("inserts mention at end of text", () => {
    const result = insertMention("hello ", 6, 6, { userId: "1", displayName: "John", position: 6 });
    expect(result.text).toBe("hello @John ");
    expect(result.cursorPos).toBe(12);
  });

  test("replaces partial query with mention", () => {
    const result = insertMention("hello @jo", 6, 9, { userId: "1", displayName: "John Doe", position: 6 });
    expect(result.text).toBe("hello @John Doe ");
    expect(result.cursorPos).toBe(16);
  });

  test("preserves text after cursor", () => {
    const result = insertMention("hello @jo world", 6, 9, { userId: "1", displayName: "John", position: 6 });
    expect(result.text).toBe("hello @John  world");
    expect(result.cursorPos).toBe(12);
  });
});

describe("parseSegments - position-based mention rendering", () => {
  test("returns plain text when no mentions", () => {
    const segments = parseSegments("hello world");
    expect(segments).toEqual([{ type: "text", value: "hello world" }]);
  });

  test("returns plain text when mentions array is empty", () => {
    const segments = parseSegments("hello world", []);
    expect(segments).toEqual([{ type: "text", value: "hello world" }]);
  });

  test("renders a single mention at start of text", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 0 },
    ];
    const segments = parseSegments("@John hello", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-1", displayName: "John" },
      { type: "text", value: " hello" },
    ]);
  });

  test("renders a single mention in middle of text", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 6 },
    ];
    const segments = parseSegments("hello @John world", mentions);
    expect(segments).toEqual([
      { type: "text", value: "hello " },
      { type: "mention", userId: "user-1", displayName: "John" },
      { type: "text", value: " world" },
    ]);
  });

  test("renders a single mention at end of text", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 6 },
    ];
    const segments = parseSegments("hello @John", mentions);
    expect(segments).toEqual([
      { type: "text", value: "hello " },
      { type: "mention", userId: "user-1", displayName: "John" },
    ]);
  });

  test("renders multiple mentions with correct user IDs", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John Doe", position: 0 },
      { userId: "user-2", displayName: "Jane Smith", position: 10 },
    ];
    const segments = parseSegments("@John Doe @Jane Smith please review", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-1", displayName: "John Doe" },
      { type: "text", value: " " },
      { type: "mention", userId: "user-2", displayName: "Jane Smith" },
      { type: "text", value: " please review" },
    ]);
  });

  test("different users with same display name get different user IDs", () => {
    const mentions: MessageMention[] = [
      { userId: "user-aaa", displayName: "John", position: 0 },
      { userId: "user-bbb", displayName: "John", position: 6 },
    ];
    const segments = parseSegments("@John @John", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-aaa", displayName: "John" },
      { type: "text", value: " " },
      { type: "mention", userId: "user-bbb", displayName: "John" },
    ]);
  });

  test("name change does not break navigation - userId is preserved", () => {
    const mentions: MessageMention[] = [
      { userId: "user-xyz", displayName: "Old Name", position: 0 },
    ];
    const segments = parseSegments("@Old Name was here", mentions);
    expect(segments[0]).toEqual({
      type: "mention",
      userId: "user-xyz",
      displayName: "Old Name",
    });
  });

  test("ordinary text containing @Name is not converted to mention", () => {
    const segments = parseSegments("email me at @someone or not");
    expect(segments).toEqual([
      { type: "text", value: "email me at @someone or not" },
    ]);
  });

  test("only stored mentions are rendered as links", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 0 },
    ];
    const segments = parseSegments("@John and @Jane", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-1", displayName: "John" },
      { type: "text", value: " and @Jane" },
    ]);
  });

  test("handles mention with empty text after it", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 0 },
    ];
    const segments = parseSegments("@John", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-1", displayName: "John" },
    ]);
  });

  test("skips mentions with invalid positions", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 999 },
    ];
    const segments = parseSegments("hello", mentions);
    expect(segments).toEqual([{ type: "text", value: "hello" }]);
  });

  test("skips mentions with negative positions", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: -1 },
    ];
    const segments = parseSegments("hello", mentions);
    expect(segments).toEqual([{ type: "text", value: "hello" }]);
  });

  test("skips overlapping mention positions (second one ignored)", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 6 },
      { userId: "user-2", displayName: "Jane", position: 6 },
    ];
    const segments = parseSegments("hello @John @Jane", mentions);
    expect(segments[0]).toEqual({ type: "text", value: "hello " });
    expect(segments[1].type).toBe("mention");
    expect((segments[1] as any).userId).toBe("user-1");
    expect(segments[2]).toEqual({ type: "text", value: " @Jane" });
  });

  test("preserves text between mentions", () => {
    const mentions: MessageMention[] = [
      { userId: "user-1", displayName: "John", position: 0 },
      { userId: "user-2", displayName: "Jane", position: 18 },
    ];
    const segments = parseSegments("@John please tell @Jane", mentions);
    expect(segments).toEqual([
      { type: "mention", userId: "user-1", displayName: "John" },
      { type: "text", value: " please tell " },
      { type: "mention", userId: "user-2", displayName: "Jane" },
    ]);
  });

  test("renders text with no mentions as single text segment", () => {
    const segments = parseSegments("just a normal message");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", value: "just a normal message" });
  });
});

describe("Mention navigation targets", () => {
  test("each mention segment carries the correct userId for DM opening", () => {
    const mentions: MessageMention[] = [
      { userId: "abc-123", displayName: "John Doe", position: 0 },
      { userId: "def-456", displayName: "Jane Smith", position: 10 },
    ];
    const segments = parseSegments("@John Doe @Jane Smith", mentions);
    const mentionSegments = segments.filter((s) => s.type === "mention");
    expect(mentionSegments).toHaveLength(2);
    expect((mentionSegments[0] as any).userId).toBe("abc-123");
    expect((mentionSegments[1] as any).userId).toBe("def-456");
  });

  test("mention userId is stable regardless of display name", () => {
    const mentions: MessageMention[] = [
      { userId: "stable-id-999", displayName: "Whatever Name", position: 0 },
    ];
    const segments = parseSegments("@Whatever Name", mentions);
    expect((segments[0] as any).userId).toBe("stable-id-999");
  });

  test("clicking @John invokes DM handler with John's userId, not /member/ route", () => {
    const mentions: MessageMention[] = [
      { userId: "john-user-id", displayName: "John", position: 20 },
    ];
    const segments = parseSegments("Please review this. @John", mentions);
    const mentionSeg = segments.find((s) => s.type === "mention");
    expect(mentionSeg).toBeDefined();
    const userId = (mentionSeg as any).userId;
    expect(userId).toBe("john-user-id");
    expect(userId).not.toMatch(/\/member\//);
  });

  test("two mentions open different DMs based on userId", () => {
    const mentions: MessageMention[] = [
      { userId: "john-id", displayName: "John", position: 0 },
      { userId: "jane-id", displayName: "Jane", position: 6 },
    ];
    const segments = parseSegments("@John @Jane", mentions);
    const mentionSegs = segments.filter((s) => s.type === "mention");
    expect((mentionSegs[0] as any).userId).toBe("john-id");
    expect((mentionSegs[1] as any).userId).toBe("jane-id");
  });

  test("similar display names resolve to different user IDs", () => {
    const mentions: MessageMention[] = [
      { userId: "user-aaa", displayName: "John Smith", position: 0 },
      { userId: "user-bbb", displayName: "John Smith", position: 11 },
    ];
    const segments = parseSegments("@John Smith @John Smith", mentions);
    const mentionSegs = segments.filter((s) => s.type === "mention");
    expect((mentionSegs[0] as any).userId).toBe("user-aaa");
    expect((mentionSegs[1] as any).userId).toBe("user-bbb");
  });

  test("name change does not break DM navigation - userId is stable", () => {
    const mentions: MessageMention[] = [
      { userId: "user-xyz", displayName: "Old Name", position: 0 },
    ];
    const segments = parseSegments("@Old Name was here", mentions);
    expect((segments[0] as any).userId).toBe("user-xyz");
  });
});
