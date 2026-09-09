import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createEmptyDb,
  createActivity,
  submitDailyLog,
  activitiesFor,
} from "@/lib/mockDb/mutations";
import {
  ACTIVITY_RECOVERY_ENV,
  isActivityRecoveryEnabled,
} from "@/lib/activityRecovery";
import type { CreateActivityInput, TrakDb } from "@/lib/types";

function enableRecovery() {
  process.env[ACTIVITY_RECOVERY_ENV] = "true";
}
function disableRecovery() {
  delete process.env[ACTIVITY_RECOVERY_ENV];
}

const pastInput: CreateActivityInput = {
  title: "Past-dated activity",
  type: "Task",
  description: "",
  createdBy: "u1",
  startDate: "2026-08-30",
  endDate: "2026-08-30",
  startTime: "09:00",
  responsibilityIds: [],
  location: "",
  seedDate: "2026-08-30",
};

describe("Missed Activity Recovery Window", () => {
  let db: TrakDb;
  // Reference "today" after the past activity's date.
  const now = new Date("2026-08-31T10:00:00Z");

  beforeEach(() => {
    disableRecovery();
    db = createEmptyDb();
  });

  afterEach(() => {
    disableRecovery();
  });

  it("activity recovery is off by default", () => {
    expect(isActivityRecoveryEnabled()).toBe(false);
  });

  it("flags past-dated pending activities as missed when recovery is disabled", () => {
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("missed");
  });

  it("does not flag past-dated pending activities as missed during recovery (automatic processing paused)", () => {
    enableRecovery();
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("pending");
  });

  it("members can log a previous-dated activity during recovery", () => {
    enableRecovery();
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("pending");

    submitDailyLog(db, act.id, "2026-08-30", {
      objectives: "done",
      activityDescription: "",
      transcript: "",
      attendanceCount: "3",
      attendees: [],
      attachments: [],
    }, now);

    expect(act.status).toBe("completed");
  });

  it("normal activity rules still apply during recovery", () => {
    enableRecovery();
    const act = createActivity(db, pastInput, now);
    // Ownership: the member only sees their own activities.
    expect(activitiesFor(db, "u1").map((a) => a.id)).toContain(act.id);
    expect(activitiesFor(db, "u2").map((a) => a.id)).not.toContain(act.id);
  });
});
