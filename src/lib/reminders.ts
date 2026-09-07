import { iso } from "@/lib/dates";

export type ReminderTriggerType = "morning" | "due_now" | "eod";

export interface ReminderTrigger {
  type: ReminderTriggerType;
  message: string;
}

export interface ReminderStatus {
  morningSent?: boolean;
  dueSent?: boolean;
  eodSent?: boolean;
  cancelled?: boolean;
}

export interface ParsedReminderStatus {
  morningSent: boolean;
  dueSent: boolean;
  eodSent: boolean;
  cancelled: boolean;
}

export function parseReminderStatus(status: unknown): ParsedReminderStatus {
  const s = (status as Record<string, unknown>) || {};
  return {
    morningSent: Boolean(s.morningSent),
    dueSent: Boolean(s.dueSent),
    eodSent: Boolean(s.eodSent),
    cancelled: Boolean(s.cancelled),
  };
}

export function serializeReminderStatus(status: ParsedReminderStatus): ReminderStatus {
  return {
    morningSent: status.morningSent,
    dueSent: status.dueSent,
    eodSent: status.eodSent,
    cancelled: status.cancelled,
  };
}

function toLocalTimeComponents(date: Date, timeZone: string): { hour: number; minute: number; day: number; month: number; year: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  return {
    hour: get("hour"),
    minute: get("minute"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
  };
}

function isSameDay(d1: Date, d2: Date, timeZone: string): boolean {
  const c1 = toLocalTimeComponents(d1, timeZone);
  const c2 = toLocalTimeComponents(d2, timeZone);
  return c1.year === c2.year && c1.month === c2.month && c1.day === c2.day;
}

function isTimeAtOrPast(reference: Date, targetHour: number, targetMinute: number, timeZone: string): boolean {
  const ref = toLocalTimeComponents(reference, timeZone);
  if (ref.hour > targetHour) return true;
  if (ref.hour < targetHour) return false;
  return ref.minute >= targetMinute;
}

export function computeDueTriggers(
  activity: {
    id: string;
    title: string;
    dueAt: Date | null;
    startTime: string;
    reminderStatus: ReminderStatus;
    reminderVersion: number;
  },
  reference: Date,
  userTimeZone: string,
): ReminderTrigger[] {
  const status = parseReminderStatus(activity.reminderStatus);
  if (status.cancelled) return [];

  if (!activity.dueAt) return [];

  const triggers: ReminderTrigger[] = [];

  const dueLocal = toLocalTimeComponents(activity.dueAt, userTimeZone);
  const dueHour = dueLocal.hour;
  const dueMinute = dueLocal.minute;

  if (!status.morningSent && isTimeAtOrPast(reference, 0, 0, userTimeZone)) {
    if (isSameDay(activity.dueAt, reference, userTimeZone) || reference > activity.dueAt) {
      triggers.push({
        type: "morning",
        message: `You have a task scheduled for today at ${dueHour.toString().padStart(2, "0")}:${dueMinute.toString().padStart(2, "0")}. Don't forget to complete and log it.`,
      });
    }
  }

  if (!status.dueSent && isTimeAtOrPast(reference, dueHour, dueMinute, userTimeZone)) {
    if (isSameDay(activity.dueAt, reference, userTimeZone) || reference > activity.dueAt) {
      triggers.push({
        type: "due_now",
        message: `Your task is due now. Don't forget to complete and log it.`,
      });
    }
  }

  if (!status.eodSent && isTimeAtOrPast(reference, 18, 0, userTimeZone)) {
    if (isSameDay(activity.dueAt, reference, userTimeZone) || reference > activity.dueAt) {
      triggers.push({
        type: "eod",
        message: `Did you complete your task? Log it before the day ends.`,
      });
    }
  }

  return triggers;
}

export function buildDedupeKey(activityId: string, triggerType: ReminderTriggerType, reference: Date, reminderVersion: number): string {
  return `reminder:${activityId}:${triggerType}:${iso(reference)}:${reminderVersion}`;
}

// ---------------------------------------------------------------------------
// Timezone-safe wall-clock → UTC conversion (Pure UTC math; independent of the
// server machine timezone).
// ---------------------------------------------------------------------------

function tzOffsetMsAt(utcMs: number, timeZone: string): number {
  // UTC offset in milliseconds at a given UTC instant, for the given IANA zone.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(utcMs));
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

/**
 * Convert a user-supplied wall-clock date+time in their IANA timezone to the
 * exact UTC instant. Offset lookup iterates twice to resolve DST transitions
 * that straddle midnight; never depends on the server machine's timezone and
 * correctly handles non-1-hour offsets (e.g. +5:30, +5:45).
 */
export function computeDueAt(startDate: string, startTime: string, timeZone: string): Date {
  const [year, month, day] = startDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  const wallClockUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utcMs = wallClockUtcMs - tzOffsetMsAt(wallClockUtcMs, timeZone);
  utcMs = wallClockUtcMs - tzOffsetMsAt(utcMs, timeZone);
  return new Date(utcMs);
}

/**
 * Candidate-discovery window for the reminder scheduler.
 *
 * Pure UTC arithmetic — the outer bounds cover every possible IANA timezone so
 * an activity whose `dueAt` falls on the user's current calendar day (or is
 * overdue) is selectable. Eligibility is still decided by `computeDueTriggers()`.
 *
 * Bound derivation, at reference instant R (S = UTC midnight of R's UTC day):
 *   - A zone at X hours offset is on its "later" local date once local ≥ 00:00,
 *     which starts at UTC day S+24−X; that local day ends at S+48−X. The max end
 *     over positive offsets is X→0+: S+48h (e.g. UTC+1 ends its local "today" at
 *     S+47h). The latest start of any "today" is UTC−12 (midnight at S+12h).
 *   - So superset window = [S−14h, S+48h) safely covers every zone's local today
 *     (and a margin on the start for zones already into tomorrow).
 */
export function buildReminderCandidateWindow(
  reference: Date,
): { overdueCutoff: Date; todayWindowStart: Date; todayWindowEnd: Date } {
  const startUtcDay = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  );
  return {
    overdueCutoff: reference,
    todayWindowStart: new Date(startUtcDay - 14 * 60 * 60 * 1000),
    todayWindowEnd: new Date(startUtcDay + 48 * 60 * 60 * 1000),
  };
}