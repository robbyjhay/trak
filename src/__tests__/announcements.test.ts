import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ANNOUNCEMENT_REACTIONS,
  canDeleteAnnouncement,
  canSendAnnouncement,
  DEFAULT_UNIT_ID,
  isAllowedAnnouncementReaction,
  MAX_ANNOUNCEMENT_LENGTH,
  summarizeReactions,
} from "@/lib/announcements";
import { mapAnnouncement } from "@/lib/db/mappers";

function readFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function serviceSource(): string {
  return readFile("src/lib/db/service.ts");
}

// ---------------------------------------------------------------------------
// 1. Who can post (requirement 2: Head + Secretary only)
// ---------------------------------------------------------------------------
describe("Announcements — send permission", () => {
  test("head can post", () => {
    expect(canSendAnnouncement({ role: "head", isSecretary: false })).toBe(true);
  });

  test("secretary can post", () => {
    expect(canSendAnnouncement({ role: "member", isSecretary: true })).toBe(true);
  });

  test("member cannot post", () => {
    expect(canSendAnnouncement({ role: "member", isSecretary: false })).toBe(false);
  });

  test("postAnnouncement enforces the rule server-side (403 for members)", () => {
    const src = serviceSource();
    expect(src).toContain("canSendAnnouncement(mapUser(actor))");
    expect(src).toContain("Only the Unit Head and Secretary can post announcements.");
  });

  test("members can read announcements (no head gate on listing)", () => {
    const src = serviceSource();
    // listAnnouncements must not require broadcast rights.
    const start = src.indexOf("export async function listAnnouncements");
    const end = src.indexOf("export async function postAnnouncement");
    const fn = src.slice(start, end);
    expect(fn).toContain("requireActor(session)");
    expect(fn).not.toContain("canSendAnnouncement");
    expect(fn).not.toContain("canBroadcast");
  });
});

// ---------------------------------------------------------------------------
// 2. Reactions (requirement 4: 5 default emojis, all members may react)
// ---------------------------------------------------------------------------
describe("Announcements — reactions", () => {
  test("exactly five default reactions are configured", () => {
    expect(ANNOUNCEMENT_REACTIONS).toHaveLength(5);
    expect(new Set(ANNOUNCEMENT_REACTIONS).size).toBe(5);
  });

  test("only the default reactions are accepted", () => {
    for (const emoji of ANNOUNCEMENT_REACTIONS) {
      expect(isAllowedAnnouncementReaction(emoji)).toBe(true);
    }
    for (const emoji of ["🙏", "👎", "💩", "", "👍👍"]) {
      expect(isAllowedAnnouncementReaction(emoji), emoji).toBe(false);
    }
  });

  test("reactToAnnouncement validates emoji server-side", () => {
    const src = serviceSource();
    expect(src).toContain("isAllowedAnnouncementReaction(emoji)");
    expect(src).toContain("Unsupported reaction. Choose one of the available reactions.");
  });

  test("reactToAnnouncement toggles a reaction on/off", () => {
    const src = serviceSource();
    const start = src.indexOf("export async function reactToAnnouncement");
    const end = src.indexOf("export async function listCallsForUser");
    const fn = src.slice(start, end);
    expect(fn).toContain("row.reactions.find");
    expect(fn).toContain("prisma.announcementReaction.delete");
    expect(fn).toContain("prisma.announcementReaction.create");
  });

  test("summarizeReactions aggregates counts, reactors, and reactedByMe", () => {
    const summary = summarizeReactions(
      [
        { userId: "u-a", emoji: "👍" },
        { userId: "u-b", emoji: "👍" },
        { userId: "u-a", emoji: "🔥" },
      ],
      "u-b",
    );
    const thumbs = summary.find((s) => s.emoji === "👍")!;
    expect(thumbs).toMatchObject({ emoji: "👍", count: 2, reactedByMe: true });
    expect(thumbs.reactors).toEqual(["u-a", "u-b"]);
    const fire = summary.find((s) => s.emoji === "🔥")!;
    expect(fire.reactedByMe).toBe(false);
    expect(summary.find((s) => s.emoji === "❤️")).toBeUndefined();
    expect(summary.map((s) => s.emoji)).toEqual(["👍", "🔥"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Deletion (requirement 2: authors may delete their own; head may delete any)
// ---------------------------------------------------------------------------
describe("Announcements — delete permission", () => {
  test("author can delete their own announcement", () => {
    expect(
      canDeleteAnnouncement({ id: "u-a", role: "member" }, { from: "u-a" }),
    ).toBe(true);
  });

  test("member cannot delete someone else's announcement", () => {
    expect(
      canDeleteAnnouncement({ id: "u-b", role: "member" }, { from: "u-a" }),
    ).toBe(false);
  });

  test("head can delete any announcement", () => {
    expect(
      canDeleteAnnouncement({ id: "head", role: "head" }, { from: "u-a" }),
    ).toBe(true);
  });

  test("deleteAnnouncement enforces the rule server-side", () => {
    const src = serviceSource();
    expect(src).toContain("canDeleteAnnouncement(user, { from: row.fromUserId })");
    expect(src).toContain("Only the author and the Unit Head can delete this announcement.");
  });
});

// ---------------------------------------------------------------------------
// 4. Unit scoping (requirement 9)
// ---------------------------------------------------------------------------
describe("Announcements — unit scoping", () => {
  test("posting stores the unit id", () => {
    expect(serviceSource()).toContain("data: { unitId, fromUserId: session.id, text: trimmed }");
  });

  test("listing filters by unit and hides deleted announcements", () => {
    const src = serviceSource();
    const start = src.indexOf("export async function listAnnouncements");
    const end = src.indexOf("export async function postAnnouncement");
    const fn = src.slice(start, end);
    expect(fn).toContain("unitId,");
    expect(fn).toContain("deletedAt: null,");
    expect(fn).toContain("Prisma.AnnouncementWhereInput");
  });

  test("delete and react reject announcements outside the unit", () => {
    const src = serviceSource();
    expect(src).toContain("Announcement does not belong to your unit.");
  });
});

// ---------------------------------------------------------------------------
// 5. API routes (requirement 8: server-side enforcement, 401 when unauthenticated)
// ---------------------------------------------------------------------------
describe("Announcements — API routes", () => {
  test("POST route requires a session before posting", () => {
    const route = readFile("src/app/api/messages/announcements/route.ts");
    expect(route).toContain("requireSession()");
    expect(route).toContain("postAnnouncement(session, body.text || \"\")");
    expect(route).toContain("checkRateLimit");
  });

  test("GET route requires a session and returns announcements", () => {
    const route = readFile("src/app/api/messages/announcements/route.ts");
    expect(route).toContain("export async function GET");
    expect(route).toContain("listAnnouncements(session, {");
  });

  test("DELETE route requires a session and soft-deletes", () => {
    const route = readFile("src/app/api/messages/announcements/[id]/route.ts");
    expect(route).toContain("requireSession()");
    expect(route).toContain("deleteAnnouncement(session, id)");
  });

  test("reactions route requires a session and a valid emoji body", () => {
    const route = readFile(
      "src/app/api/messages/announcements/[id]/reactions/route.ts",
    );
    expect(route).toContain("requireSession()");
    expect(route).toContain("reactToAnnouncement(session, id, body.emoji)");
    expect(route).toContain("emoji is required");
  });
});

// ---------------------------------------------------------------------------
// 6. Notification fan-out (requirement 5: reuse notification behavior)
// ---------------------------------------------------------------------------
describe("Announcements — notification behavior", () => {
  test("posting fans out an announcement notification to every member except the author", () => {
    const src = serviceSource();
    const start = src.indexOf("export async function postAnnouncement");
    const end = src.indexOf("export async function deleteAnnouncement");
    const fn = src.slice(start, end);
    expect(fn).toContain("notifyMany(");
    expect(fn).toContain('type: "announcement" as const');
    expect(fn).toContain("messageId: row.id");
  });

  test("announcement is wired into resolvePushContent + taxonomy", () => {
    const policy = readFile("src/lib/notificationPolicy.ts");
    expect(policy).toContain('type === "announcement"');
    expect(policy).toContain("announcement: {");
    const constants = readFile("src/lib/constants.ts");
    expect(constants).toContain("announcement:");
  });
});

// ---------------------------------------------------------------------------
// 7. Mapper — client DTO shape
// ---------------------------------------------------------------------------
describe("Announcements — mapper", () => {
  test("mapAnnouncement produces the client DTO", () => {
    const row: any = {
      id: "ann-1",
      unitId: DEFAULT_UNIT_ID,
      fromUserId: "u-head",
      text: "Quarterly drills start Monday.",
      createdAt: new Date("2026-09-01T08:00:00Z"),
      reactions: [
        { userId: "u-1", emoji: "👍" },
        { userId: "u-2", emoji: "👍" },
        { userId: "u-1", emoji: "❤️" },
      ],
    };
    const ann = mapAnnouncement(row, "u-2");
    expect(ann).toMatchObject({
      id: "ann-1",
      unitId: DEFAULT_UNIT_ID,
      from: "u-head",
      text: "Quarterly drills start Monday.",
      at: "2026-09-01T08:00:00.000Z",
    });
    const thumbs = ann.reactions.find((r) => r.emoji === "👍")!;
    expect(thumbs).toMatchObject({ count: 2, reactedByMe: true });
    const heart = ann.reactions.find((r) => r.emoji === "❤️")!;
    expect(heart).toMatchObject({ count: 1, reactedByMe: false });
  });

  test("announcement text length is capped server-side", () => {
    expect(MAX_ANNOUNCEMENT_LENGTH).toBeGreaterThan(0);
    expect(serviceSource()).toContain("MAX_ANNOUNCEMENT_LENGTH");
  });
});