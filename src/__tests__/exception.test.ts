import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyDb,
  createActivity,
  requestException,
  approveException,
  rejectException,
  expireExceptions,
  submitDailyLog,
} from "@/lib/mockDb/mutations";
import { resetUid } from "@/lib/mockDb/mutations";
import type { CreateActivityInput, TrakDb } from "@/lib/types";

function seedMissedActivity(db: TrakDb, now: Date) {
  const input: CreateActivityInput = {
    title: "Team Standup",
    type: "Meeting",
    description: "",
    createdBy: "u1",
    startDate: "2026-08-30",
    endDate: "2026-08-30",
    startTime: "09:00",
    responsibilityIds: [],
    location: "",
    seedDate: "2026-08-30",
  };
  const act = createActivity(db, input, now);
  db.dailyLogs.push({
    id: "log1",
    activityId: act.id,
    date: "2026-08-30",
    objectives: "",
    activityDescription: "",
    transcript: "",
    attendanceCount: "",
    attendanceNotes: "",
    attendees: [],
    rsvpToken: null,
    attachments: [],
    status: "pending",
    submittedAt: null,
    amountReleasedNgn: null,
    amountSpentNgn: null,
    spendingItems: [],
  });
  act.status = "missed";
  return act;
}

describe("mockDb exception workflow", () => {
  let db: TrakDb;
  const now = new Date("2026-08-31T10:00:00Z");

  beforeEach(() => {
    resetUid();
    db = createEmptyDb();
  });

  it("requestException sets status to requested and stores reason", () => {
    const act = seedMissedActivity(db, now);
    const result = requestException(db, act.id, "I was busy with travel.", now);
    expect(result).not.toBeNull();
    expect(result!.exceptionStatus).toBe("requested");
    expect(result!.exceptionReason).toBe("I was busy with travel.");
  });

  it("refuses duplicate requests", () => {
    const act = seedMissedActivity(db, now);
    requestException(db, act.id, "first", now);
    const second = requestException(db, act.id, "second", now);
    expect(second).toBeNull();
  });

  it("approveException grants a 2-hour grace period", () => {
    const act = seedMissedActivity(db, now);
    requestException(db, act.id, "reason", now);
    const approved = approveException(db, act.id, now, 2 * 60 * 60 * 1000);
    expect(approved).not.toBeNull();
    expect(approved!.exceptionStatus).toBe("approved");
    expect(approved!.gracePeriodStartedAt).toEqual(now);
    expect(approved!.gracePeriodExpiresAt).toEqual(
      new Date(now.getTime() + 2 * 60 * 60 * 1000),
    );
  });

  it("rejectException sets status to rejected", () => {
    const act = seedMissedActivity(db, now);
    requestException(db, act.id, "reason", now);
    const rejected = rejectException(db, act.id);
    expect(rejected).not.toBeNull();
    expect(rejected!.exceptionStatus).toBe("rejected");
  });

  it("expireExceptions marks approved grace periods as expired", () => {
    const act = seedMissedActivity(db, now);
    requestException(db, act.id, "reason", now);
    approveException(db, act.id, new Date("2026-08-31T08:00:00Z"), 2 * 60 * 60 * 1000);
    expireExceptions(db, new Date("2026-08-31T11:00:00Z"));
    expect(act.exceptionStatus).toBe("expired");
  });
});
