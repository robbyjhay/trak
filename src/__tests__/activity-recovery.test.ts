import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createEmptyDb,
  createActivity,
  submitDailyLog,
  activitiesFor,
  recoverMissedActivities,
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

const pastInputU2: CreateActivityInput = {
  title: "U2 past-dated activity",
  type: "Task",
  description: "",
  createdBy: "u2",
  startDate: "2026-08-29",
  endDate: "2026-08-29",
  startTime: "10:00",
  responsibilityIds: [],
  location: "",
  seedDate: "2026-08-29",
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

describe("Missed Activity Recovery — multi-user batch recovery", () => {
  let db: TrakDb;
  const now = new Date("2026-08-31T10:00:00Z");

  beforeEach(() => {
    disableRecovery();
    db = createEmptyDb();
  });

  afterEach(() => {
    disableRecovery();
  });

  it("recovery mode is no-op when disabled", () => {
    createActivity(db, pastInput, now);
    const { recovered } = recoverMissedActivities(db);
    expect(recovered).toBe(0);
  });

  it("reverts already-missed activities for both users when recovery is enabled", () => {
    // Create activities WITHOUT recovery — they become missed.
    const actU1 = createActivity(db, pastInput, now);
    const actU2 = createActivity(db, pastInputU2, now);
    expect(actU1.status).toBe("missed");
    expect(actU2.status).toBe("missed");

    // Verify both users have missed activities.
    expect(activitiesFor(db, "u1").filter((a) => a.status === "missed")).toHaveLength(1);
    expect(activitiesFor(db, "u2").filter((a) => a.status === "missed")).toHaveLength(1);

    // Enable recovery and run batch recovery.
    enableRecovery();
    const { recovered } = recoverMissedActivities(db);

    // Both activities should be recovered.
    expect(recovered).toBe(2);
    expect(actU1.status).toBe("pending");
    expect(actU2.status).toBe("pending");

    // Both users can now see their activities as pending.
    expect(activitiesFor(db, "u1").filter((a) => a.status === "pending")).toHaveLength(1);
    expect(activitiesFor(db, "u2").filter((a) => a.status === "pending")).toHaveLength(1);
  });

  it("does not recover completed activities", () => {
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("missed");

    // Submit all logs — activity becomes completed.
    submitDailyLog(db, act.id, "2026-08-30", {
      objectives: "done",
      activityDescription: "",
      transcript: "",
      attendanceCount: "3",
      attendees: [],
      attachments: [],
    }, now);
    expect(act.status).toBe("completed");

    enableRecovery();
    const { recovered } = recoverMissedActivities(db);
    expect(recovered).toBe(0);
    expect(act.status).toBe("completed");
  });

  it("does not recover activities with no pending logs", () => {
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("missed");

    // All logs submitted — status becomes completed.
    submitDailyLog(db, act.id, "2026-08-30", {
      objectives: "done",
      activityDescription: "",
      transcript: "",
      attendanceCount: "3",
      attendees: [],
      attachments: [],
    }, now);

    enableRecovery();
    const { recovered } = recoverMissedActivities(db);
    expect(recovered).toBe(0);
    expect(act.status).toBe("completed");
  });

  it("is idempotent — running twice recovers the same activities", () => {
    createActivity(db, pastInput, now);
    enableRecovery();

    const first = recoverMissedActivities(db);
    expect(first.recovered).toBe(1);

    const second = recoverMissedActivities(db);
    expect(second.recovered).toBe(0);
  });

  it("members can submit logs for recovered activities without an exception", () => {
    const act = createActivity(db, pastInput, now);
    expect(act.status).toBe("missed");

    enableRecovery();
    recoverMissedActivities(db);
    expect(act.status).toBe("pending");

    // Submitting should now succeed without an exception.
    submitDailyLog(db, act.id, "2026-08-30", {
      objectives: "done",
      activityDescription: "",
      transcript: "",
      attendanceCount: "5",
      attendees: [],
      attachments: [],
    }, now);

    expect(act.status).toBe("completed");
  });
});
