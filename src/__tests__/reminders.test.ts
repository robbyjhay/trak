import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeDueTriggers,
  parseReminderStatus,
  serializeReminderStatus,
  buildDedupeKey,
  computeDueAt,
  buildReminderCandidateWindow,
} from "@/lib/reminders";

describe("reminders.ts — trigger computation", () => {
  const baseActivity = {
    id: "act-1",
    title: "Test Task",
    dueAt: new Date("2026-09-07T07:00:00.000Z"), // 08:00 Africa/Lagos
    startTime: "08:00",
    reminderStatus: {},
    reminderVersion: 1,
  };

  const lagosTz = "Africa/Lagos";

  function makeRef(dateStr: string): Date {
    return new Date(dateStr);
  }

  it("fires morning trigger at 00:00 local on due date", () => {
    const ref = makeRef("2026-09-07T00:00:00.000Z"); // 00:00 UTC = 01:00 Lagos... wait, need to check
    // Actually 00:00 UTC = 01:00 Lagos (UTC+1). We need 00:00 Lagos = 23:00 UTC previous day
    const refLagosMidnight = makeRef("2026-09-06T23:00:00.000Z"); // 00:00 Lagos on Sep 7
    const triggers = computeDueTriggers(baseActivity, refLagosMidnight, lagosTz);
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
    expect(triggers.find((t) => t.type === "morning")?.message).toContain("08:00");
  });

  it("catches up morning trigger if processor runs late (00:05)", () => {
    const ref = makeRef("2026-09-06T23:05:00.000Z"); // 00:05 Lagos on Sep 7
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("does not re-fire morning if already sent", () => {
    const ref = makeRef("2026-09-06T23:05:00.000Z");
    const act = { ...baseActivity, reminderStatus: { morningSent: true } };
    const triggers = computeDueTriggers(act, ref, lagosTz);
    expect(triggers.some((t) => t.type === "morning")).toBe(false);
  });

  it("fires due-now trigger at startTime (08:00 Lagos = 07:00 UTC)", () => {
    const ref = makeRef("2026-09-07T07:00:00.000Z"); // 08:00 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "due_now")).toBe(true);
  });

  it("catches up due-now trigger if processor runs late (08:03)", () => {
    const ref = makeRef("2026-09-07T07:03:00.000Z"); // 08:03 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "due_now")).toBe(true);
  });

  it("does not fire due-now before startTime", () => {
    const ref = makeRef("2026-09-07T06:59:00.000Z"); // 07:59 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "due_now")).toBe(false);
  });

  it("fires EOD trigger at 18:00 local (17:00 UTC)", () => {
    const ref = makeRef("2026-09-07T17:00:00.000Z"); // 18:00 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "eod")).toBe(true);
  });

  it("catches up EOD trigger if processor runs late (18:05)", () => {
    const ref = makeRef("2026-09-07T17:05:00.000Z"); // 18:05 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "eod")).toBe(true);
  });

  it("does not fire EOD before 18:00", () => {
    const ref = makeRef("2026-09-07T16:59:00.000Z"); // 17:59 Lagos
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "eod")).toBe(false);
  });

  it("returns no triggers if cancelled", () => {
    const ref = makeRef("2026-09-06T23:00:00.000Z");
    const act = { ...baseActivity, reminderStatus: { cancelled: true } };
    const triggers = computeDueTriggers(act, ref, lagosTz);
    expect(triggers.length).toBe(0);
  });

  it("returns no triggers if dueAt is null", () => {
    const ref = makeRef("2026-09-06T23:00:00.000Z");
    const act = { ...baseActivity, dueAt: null };
    const triggers = computeDueTriggers(act, ref, lagosTz);
    expect(triggers.length).toBe(0);
  });

  it("returns no triggers if not yet due date", () => {
    const ref = makeRef("2026-09-05T12:00:00.000Z"); // day before
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.length).toBe(0);
  });

  it("handles different timezone (UTC)", () => {
    const act = { ...baseActivity, dueAt: new Date("2026-09-07T08:00:00.000Z"), startTime: "08:00" };
    const ref = makeRef("2026-09-07T00:00:00.000Z"); // midnight UTC
    const triggers = computeDueTriggers(act, ref, "UTC");
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("builds correct dedupe key", () => {
    const key = buildDedupeKey("act-1", "morning", new Date("2026-09-07T00:00:00.000Z"), 1);
    expect(key).toBe("reminder:act-1:morning:2026-09-07:1");
  });

  it("increments version in dedupe key on reschedule", () => {
    const key1 = buildDedupeKey("act-1", "morning", new Date("2026-09-07T00:00:00.000Z"), 1);
    const key2 = buildDedupeKey("act-1", "morning", new Date("2026-09-07T00:00:00.000Z"), 2);
    expect(key1).not.toBe(key2);
  });

  it("parseReminderStatus handles missing/partial status", () => {
    expect(parseReminderStatus({})).toEqual({ morningSent: false, dueSent: false, eodSent: false, cancelled: false });
    expect(parseReminderStatus({ morningSent: true })).toEqual({ morningSent: true, dueSent: false, eodSent: false, cancelled: false });
    expect(parseReminderStatus(null)).toEqual({ morningSent: false, dueSent: false, eodSent: false, cancelled: false });
    expect(parseReminderStatus(undefined)).toEqual({ morningSent: false, dueSent: false, eodSent: false, cancelled: false });
  });

  it("serializeReminderStatus round-trips", () => {
    const input = { morningSent: true, dueSent: false, eodSent: true, cancelled: false };
    const serialized = serializeReminderStatus(input);
    expect(parseReminderStatus(serialized)).toEqual(input);
  });

  it("does not fire triggers after due date if already past (catch-up on restart)", () => {
    // Server restarts later same day (Sep 7 13:00 Lagos = 12:00 UTC)
    // Morning (00:00) and due-now (08:00) should fire, EOD (18:00) not yet
    const ref = makeRef("2026-09-07T12:00:00.000Z");
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.length).toBe(2);
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
    expect(triggers.some((t) => t.type === "due_now")).toBe(true);
    expect(triggers.some((t) => t.type === "eod")).toBe(false);
  });

  it("respects reminderStatus flags even for catch-up", () => {
    // Same day catch-up after EOD: morning and due already sent, only EOD should fire
    // 17:00 UTC = 18:00 Lagos
    const ref = makeRef("2026-09-07T17:00:00.000Z");
    const act = { ...baseActivity, reminderStatus: { morningSent: true, dueSent: true } };
    const triggers = computeDueTriggers(act, ref, lagosTz);
    expect(triggers.length).toBe(1);
    expect(triggers[0].type).toBe("eod");
  });

  it("handles DST-like offset (timezone with different UTC offset)", () => {
    // Use a timezone with DST (e.g., America/New_York)
    // But Lagos doesn't have DST, so test with a different zone
    const act = { ...baseActivity, dueAt: new Date("2026-03-15T12:00:00.000Z"), startTime: "08:00" };
    const ref = makeRef("2026-03-15T04:00:00.000Z"); // 00:00 EDT (UTC-4)
    const triggers = computeDueTriggers(act, ref, "America/New_York");
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("midnight boundary: morning trigger on due date, not day before", () => {
    // 23:59 UTC on Sep 6 = 00:59 Lagos on Sep 7 (past midnight)
    const ref = makeRef("2026-09-06T23:59:00.000Z");
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("midnight boundary: no morning trigger at 22:59 UTC (23:59 Lagos previous day)", () => {
    const ref = makeRef("2026-09-06T22:59:00.000Z"); // 23:59 Lagos on Sep 6
    const triggers = computeDueTriggers(baseActivity, ref, lagosTz);
    expect(triggers.some((t) => t.type === "morning")).toBe(false);
  });
});

describe("reminders — integration scenarios", () => {
  it("reschedule increments version and cancels old triggers", () => {
    const act1 = {
      id: "act-1",
      title: "Test Task",
      dueAt: new Date("2026-09-07T07:00:00.000Z"),
      startTime: "08:00",
      reminderStatus: { morningSent: true },
      reminderVersion: 1,
    };
    const act2 = {
      ...act1,
      dueAt: new Date("2026-09-07T09:00:00.000Z"), // rescheduled to 10:00 Lagos
      startTime: "10:00",
      reminderStatus: { cancelled: true },
      reminderVersion: 2,
    };
    const ref = new Date("2026-09-07T07:00:00.000Z"); // old due time
    const triggers1 = computeDueTriggers(act1, ref, "Africa/Lagos");
    const triggers2 = computeDueTriggers(act2, ref, "Africa/Lagos");
    // Old version would have fired, but new version is cancelled
    expect(triggers2.length).toBe(0);
  });

  it("completion cancels all future triggers", () => {
    const act = {
      id: "act-1",
      title: "Test Task",
      dueAt: new Date("2026-09-07T07:00:00.000Z"),
      startTime: "08:00",
      reminderStatus: { cancelled: true },
      reminderVersion: 1,
    };
    const ref = new Date("2026-09-08T00:00:00.000Z");
    const triggers = computeDueTriggers(act, ref, "Africa/Lagos");
    expect(triggers.length).toBe(0);
  });

  it("deletion cancels all future triggers", () => {
    const act = {
      id: "act-1",
      title: "Test Task",
      dueAt: new Date("2026-09-07T07:00:00.000Z"),
      startTime: "08:00",
      reminderStatus: { cancelled: true },
      reminderVersion: 1,
    };
    const ref = new Date("2026-09-08T00:00:00.000Z");
    const triggers = computeDueTriggers(act, ref, "Africa/Lagos");
    expect(triggers.length).toBe(0);
  });

  it("reschedule to new day: old reminders cancelled, new schedule active", () => {
    // Original: Monday Sep 7 08:00 Lagos = 07:00 UTC
    const originalActivity = {
      id: "act-1",
      title: "Test Task",
      dueAt: new Date("2026-09-07T07:00:00.000Z"),
      startTime: "08:00",
      reminderStatus: { cancelled: false, morningSent: false, dueSent: false, eodSent: false },
      reminderVersion: 1,
    };

    // Rescheduled: Tuesday Sep 8 10:00 Lagos = 09:00 UTC
    const rescheduledActivity = {
      ...originalActivity,
      dueAt: new Date("2026-09-08T09:00:00.000Z"),
      startTime: "10:00",
      reminderStatus: { cancelled: false, morningSent: false, dueSent: false, eodSent: false },
      reminderVersion: 2,
    };

    // Monday 07:00 UTC (08:00 Lagos) - old due time
    // Old activity would fire due-now, but new activity (v2) should NOT fire because dueAt is now Sep 8
    const mondayDue = new Date("2026-09-07T07:00:00.000Z");
    const triggersOldAtOldTime = computeDueTriggers(originalActivity, mondayDue, "Africa/Lagos");
    expect(triggersOldAtOldTime.some((t) => t.type === "due_now")).toBe(true);

    // New activity at old time - should NOT fire (dueAt is now Sep 8)
    const triggersNewAtOldTime = computeDueTriggers(rescheduledActivity, mondayDue, "Africa/Lagos");
    expect(triggersNewAtOldTime.length).toBe(0);

    // Tuesday 00:00 Lagos (Sep 7 23:00 UTC) - morning trigger for new schedule
    const tuesdayMorning = new Date("2026-09-07T23:00:00.000Z");
    const tuesdayMorningTriggers = computeDueTriggers(rescheduledActivity, tuesdayMorning, "Africa/Lagos");
    expect(tuesdayMorningTriggers.some((t) => t.type === "morning")).toBe(true);
    expect(tuesdayMorningTriggers.find((t) => t.type === "morning")?.message).toContain("10:00");

    // Tuesday 09:00 UTC (10:00 Lagos) - due-now trigger for new schedule
    const tuesdayDue = new Date("2026-09-08T09:00:00.000Z");
    const tuesdayDueTriggers = computeDueTriggers(rescheduledActivity, tuesdayDue, "Africa/Lagos");
    expect(tuesdayDueTriggers.some((t) => t.type === "due_now")).toBe(true);

    // Tuesday 17:00 UTC (18:00 Lagos) - EOD trigger for new schedule
    const tuesdayEod = new Date("2026-09-08T17:00:00.000Z");
    const tuesdayEodTriggers = computeDueTriggers(rescheduledActivity, tuesdayEod, "Africa/Lagos");
    expect(tuesdayEodTriggers.some((t) => t.type === "eod")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeDueAt — wall-clock (user timezone) → correct UTC instant (Fix 1)
// ---------------------------------------------------------------------------
describe("computeDueAt — timezone-safe storage", () => {
  it("Lagos 14:30 → 13:30 UTC (single UTC+1 offset applied exactly once)", () => {
    const dueAt = computeDueAt("2026-09-07", "14:30", "Africa/Lagos");
    expect(dueAt.toISOString()).toBe("2026-09-07T13:30:00.000Z");
  });

  it("Lagos 08:00 → 07:00 UTC (matches existing reminder tests)", () => {
    const dueAt = computeDueAt("2026-09-07", "08:00", "Africa/Lagos");
    expect(dueAt.toISOString()).toBe("2026-09-07T07:00:00.000Z");
  });

  it("UTC is a no-op passthrough", () => {
    const dueAt = computeDueAt("2026-09-07", "08:00", "UTC");
    expect(dueAt.toISOString()).toBe("2026-09-07T08:00:00.000Z");
  });

  it("handles non-1-hour offset Asia/Kolkata +5:30", () => {
    const dueAt = computeDueAt("2026-09-07", "08:00", "Asia/Kolkata");
    expect(dueAt.toISOString()).toBe("2026-09-07T02:30:00.000Z");
  });

  it("handles non-1-hour offset Asia/Kathmandu +5:45", () => {
    const dueAt = computeDueAt("2026-09-07", "08:00", "Asia/Kathmandu");
    expect(dueAt.toISOString()).toBe("2026-09-07T02:15:00.000Z");
  });

  it("handles negative-offset America/New_York in summer (EDT −4)", () => {
    const dueAt = computeDueAt("2026-07-15", "08:00", "America/New_York");
    expect(dueAt.toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("handles negative-offset America/New_York in winter (EST −5)", () => {
    const dueAt = computeDueAt("2026-01-15", "08:00", "America/New_York");
    expect(dueAt.toISOString()).toBe("2026-01-15T13:00:00.000Z");
  });

  it("handles positive full-hour offset with DST Europe/Berlin: summer +2 → 06:00 UTC", () => {
    const dueAt = computeDueAt("2026-07-15", "08:00", "Europe/Berlin");
    expect(dueAt.toISOString()).toBe("2026-07-15T06:00:00.000Z");
  });

  it("handles Europe/Berlin winter +1 → 07:00 UTC", () => {
    const dueAt = computeDueAt("2026-01-15", "08:00", "Europe/Berlin");
    expect(dueAt.toISOString()).toBe("2026-01-15T07:00:00.000Z");
  });

  it("handles southern-hemisphere DST Australia/Sydney winter +10 (July)", () => {
    const dueAt = computeDueAt("2026-07-15", "08:00", "Australia/Sydney");
    expect(dueAt.toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("handles Australia/Sydney summer +11 (January)", () => {
    const dueAt = computeDueAt("2026-01-15", "08:00", "Australia/Sydney");
    expect(dueAt.toISOString()).toBe("2026-01-14T21:00:00.000Z");
  });

  it("is independent of the server machine timezone", () => {
    // The same wall-clock input in the same IANA zone must yield the same UTC
    // instant regardless of process.env.TZ. We snapshot the result and re-run
    // with TZ forcibly set to a different zone.
    const baseline = computeDueAt("2026-09-07", "14:30", "Africa/Lagos").getTime();
    const prevTz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const otherMachine = computeDueAt("2026-09-07", "14:30", "Africa/Lagos").getTime();
      expect(otherMachine).toBe(baseline);
    } finally {
      process.env.TZ = prevTz;
    }
  });
});

// ---------------------------------------------------------------------------
// buildReminderCandidateWindow — discovery before dueAt (Fix 2)
// ---------------------------------------------------------------------------
describe("buildReminderCandidateWindow — morning discovery window", () => {
  it("covers a task due later today in Lagos (window end = startUtcDay +48h)", () => {
    // Reference: Monday 00:00 Lagos = Sunday 23:00 UTC → S = Sunday 00:00 UTC.
    const ref = new Date("2026-09-06T23:00:00.000Z");
    const window = buildReminderCandidateWindow(ref);
    // A task due Monday 14:30 Lagos = 13:30 UTC must be inside the window
    const dueAt = computeDueAt("2026-09-07", "14:30", "Africa/Lagos");
    expect(dueAt.getUTCHours()).toBe(13);
    expect(dueAt.getTime()).toBeGreaterThanOrEqual(window.todayWindowStart.getTime());
    expect(dueAt.getTime()).toBeLessThanOrEqual(window.todayWindowEnd.getTime());
  });

  it("includes the overdue cutoff (reference itself)", () => {
    const ref = new Date("2026-09-06T23:00:00.000Z");
    const window = buildReminderCandidateWindow(ref);
    expect(window.overdueCutoff.getTime()).toBe(ref.getTime());
  });

  it("bounds span all IANA timezones (UTC−12 … UTC+14)", () => {
    const ref = new Date("2026-09-07T12:00:00.000Z");
    const window = buildReminderCandidateWindow(ref);
    // Earliest local midnight anywhere is UTC+14 → window starts 14h before UTC day
    const startUtcDay = Date.UTC(2026, 8, 7);
    expect(window.todayWindowStart.getTime()).toBe(startUtcDay - 14 * 3600_000);
    // Latest local day end reaches startUtcDay + 48h
    expect(window.todayWindowEnd.getTime()).toBe(startUtcDay + 48 * 3600_000);
  });

  it("makes a task due Monday 08:00 discoverable at Monday 00:00 local", () => {
    const ref = new Date("2026-09-06T23:00:00.000Z"); // Monday 00:00 Lagos
    const window = buildReminderCandidateWindow(ref);
    const taskDue = new Date("2026-09-07T07:00:00.000Z"); // Monday 08:00 Lagos
    const discoverable =
      taskDue.getTime() <= ref.getTime() || // overdue
      (taskDue.getTime() >= window.todayWindowStart.getTime() &&
        taskDue.getTime() <= window.todayWindowEnd.getTime());
    expect(discoverable).toBe(true);
  });

  it("makes a task due Monday 14:30 discoverable at Monday 00:00 local (deep-day boundary)", () => {
    const ref = new Date("2026-09-06T23:00:00.000Z"); // Monday 00:00 Lagos
    const window = buildReminderCandidateWindow(ref);
    const taskDue = computeDueAt("2026-09-07", "14:30", "Africa/Lagos"); // Monday 13:30 UTC
    const discoverable =
      taskDue.getTime() <= ref.getTime() ||
      (taskDue.getTime() >= window.todayWindowStart.getTime() &&
        taskDue.getTime() <= window.todayWindowEnd.getTime());
    expect(discoverable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fix 2 — a task scheduled later Monday gets its morning reminder at midnight,
// even though dueAt is still in the future. computeDueTriggers is the gates.
// ---------------------------------------------------------------------------
describe("morning trigger discoverability before dueAt (Fix 2)", () => {
  const mondayTask = {
    id: "act-mon-8am",
    title: "Monday Task",
    // Monday 08:00 Lagos, correctly stored:
    dueAt: new Date("2026-09-07T07:00:00.000Z"),
    startTime: "08:00",
    reminderStatus: { cancelled: false, morningSent: false, dueSent: false, eodSent: false },
    reminderVersion: 1,
  };

  it("task created Saturday for Monday 8 AM → morning fires Monday 12 AM", () => {
    // Monday 00:00 Lagos = Sunday 23:00 UTC
    const ref = new Date("2026-09-06T23:00:00.000Z");
    const triggers = computeDueTriggers(mondayTask, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
    expect(triggers.some((t) => t.type === "due_now")).toBe(false);
  });

  it("due later Monday → midnight morning fires even though dueAt is future", () => {
    // The scheduler runs at midnight Lagos. The candidate window (Fix 2) must
    // make this task discoverable, and computeDueTriggers must fire morning.
    const ref = new Date("2026-09-06T23:00:00.000Z"); // Monday 00:00 Lagos
    const window = buildReminderCandidateWindow(ref);
    // discovery is guaranteed by the window superset (military test):
    const discoverable =
      mondayTask.dueAt.getTime() >= window.todayWindowStart.getTime() &&
      mondayTask.dueAt.getTime() <= window.todayWindowEnd.getTime();
    expect(discoverable).toBe(true);

    // And the gate actually fires morning for it:
    const triggers = computeDueTriggers(mondayTask, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("due-now fires at 08:00 Lagos (07:00 UTC)", () => {
    const ref = new Date("2026-09-07T07:00:00.000Z");
    const triggers = computeDueTriggers(mondayTask, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "due_now")).toBe(true);
  });

  it("EOD fires at 18:00 Lagos (17:00 UTC) if still pending", () => {
    const ref = new Date("2026-09-07T17:00:00.000Z");
    const triggers = computeDueTriggers(mondayTask, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "eod")).toBe(true);
  });

  it("overdue task from a previous day remains eligible for morning catch-up", () => {
    // Task due Sunday 08:00 Lagos; Monday midnight catch-up fires morning.
    const sundayTask = {
      ...mondayTask,
      id: "act-sun",
      dueAt: new Date("2026-09-06T07:00:00.000Z"), // Sunday 08:00 Lagos
    };
    const ref = new Date("2026-09-06T23:00:00.000Z"); // Monday 00:00 Lagos
    const triggers = computeDueTriggers(sundayTask, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "morning")).toBe(true);
  });

  it("completed/rescheduled/deleted tasks stay suppressed (cancelled status)", () => {
    const suppressed = { ...mondayTask, reminderStatus: { cancelled: true } };
    const ref = new Date("2026-09-06T23:00:00.000Z");
    expect(computeDueTriggers(suppressed, ref, "Africa/Lagos").length).toBe(0);
  });

  it("already-sent morning is not re-fired later that day", () => {
    const sent = { ...mondayTask, reminderStatus: { morningSent: true } };
    const ref = new Date("2026-09-06T23:05:00.000Z");
    const triggers = computeDueTriggers(sent, ref, "Africa/Lagos");
    expect(triggers.some((t) => t.type === "morning")).toBe(false);
  });
});