import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyDb,
  createActivity,
  respondToCollab,
  submitDailyLog,
  activitiesFor,
} from "@/lib/mockDb/mutations";
import { resetUid } from "@/lib/mockDb/mutations";
import type { CreateActivityInput, TrakDb } from "@/lib/types";

const now = new Date("2026-09-10T09:00:00Z");

function collabInput(
  overrides: Partial<CreateActivityInput> = {},
): CreateActivityInput {
  return {
    title: "Joint Report",
    type: "Task",
    description: "write the quarterly report together",
    createdBy: "u1",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    startTime: "09:00",
    responsibilityIds: [],
    location: "",
    collaborative: true,
    collaboratorIds: ["u3"],
    ...overrides,
  };
}

describe("Collaborative activities (mock store)", () => {
  let db: TrakDb;

  beforeEach(() => {
    resetUid();
    db = createEmptyDb();
  });

  it("creates ONE shared activity with pending invites and invite notifications", () => {
    const act = createActivity(db, collabInput(), now);

    expect(db.activities).toHaveLength(1);
    expect(act.collaborative).toBe(true);
    expect(act.collaborators).toHaveLength(1);
    expect(act.collaborators![0]).toMatchObject({
      userId: "u3",
      status: "pending",
      invitedById: "u1",
    });
    expect(
      db.notifications.some(
        (n) => n.userId === "u3" && n.type === "collaboration_invite" && n.activityId === act.id,
      ),
    ).toBe(true);
  });

  it("pending collaborators do NOT see the activity until they accept", () => {
    const act = createActivity(db, collabInput(), now);

    expect(activitiesFor(db, "u1").map((a) => a.id)).toContain(act.id);
    expect(activitiesFor(db, "u3").map((a) => a.id)).not.toContain(act.id);
    // Unrelated member never sees it.
    expect(activitiesFor(db, "u2").map((a) => a.id)).not.toContain(act.id);
  });

  it("accepting creates the member's own log set and both see the SAME activity", () => {
    const act = createActivity(db, collabInput(), now);
    const before = db.dailyLogs.filter((l) => l.activityId === act.id);

    const updated = respondToCollab(db, act.id, "u3", "accept", now);

    expect(updated?.collaborators?.[0].status).toBe("accepted");
    const after = db.dailyLogs.filter((l) => l.activityId === act.id);
    // Creator's set (1 day) + collaborator's set (1 day) = 2 logs.
    expect(after).toHaveLength(before.length + 1);
    expect(after.some((l) => l.userId === "u3")).toBe(true);
    expect(
      db.notifications.some(
        (n) =>
          n.userId === "u1" &&
          n.type === "collaboration_accepted" &&
          n.activityId === act.id,
      ),
    ).toBe(true);
    // Both participants now see the same activity id.
    expect(activitiesFor(db, "u1").map((a) => a.id)).toContain(act.id);
    expect(activitiesFor(db, "u3").map((a) => a.id)).toContain(act.id);
  });

  it("completes only when EVERY participant has submitted all of their logs", () => {
    const act = createActivity(db, collabInput(), now);
    respondToCollab(db, act.id, "u3", "accept", now);

    // Collaborator finishes but creator hasn't → still pending.
    submitDailyLog(db, act.id, "2026-09-10", { objectives: "done" }, now, "u3");
    expect(act.status).toBe("pending");

    // Creator finishes → completed.
    submitDailyLog(db, act.id, "2026-09-10", { objectives: "done" }, now, "u1");
    expect(act.status).toBe("completed");
  });

  it("declined invites remove the member from visibility and stay declined", () => {
    const act = createActivity(db, collabInput(), now);

    const updated = respondToCollab(db, act.id, "u3", "decline", now);

    expect(updated?.collaborators?.[0].status).toBe("declined");
    expect(activitiesFor(db, "u3").map((a) => a.id)).not.toContain(act.id);
    expect(
      db.notifications.some(
        (n) =>
          n.userId === "u1" &&
          n.type === "collaboration_declined" &&
          n.activityId === act.id,
      ),
    ).toBe(true);
  });

  it("a missed collaborative activity recovers when every participant still has pending logs", () => {
    const act = createActivity(
      db,
      collabInput({ startDate: "2026-09-09", endDate: "2026-09-09" }),
      now,
    );
    expect(act.status).toBe("missed");

    respondToCollab(db, act.id, "u3", "accept", now);
    expect(act.status).toBe("missed");
  });
});