import { addDays, daysBetween, iso } from "@/lib/dates";
import type {
  Activity,
  CreateActivityInput,
  DailyLog,
  Notification,
  NotifType,
  Responsibility,
  SubmitDailyLogData,
  TrakDb,
  WrapupData,
} from "@/lib/types";

let uidN = 1000;
export function uid(p: string): string {
  return p + "_" + uidN++;
}

export function resetUid(n = 1000) {
  uidN = n;
}

export function createEmptyDb(): TrakDb {
  return {
    activities: [],
    dailyLogs: [],
    comments: [],
    dms: [],
    calls: [],
    community: [],
    broadcasts: [],
    notifications: [],
  };
}

export function recomputeStatus(db: TrakDb, activityId: string, now: Date): void {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act) return;
  const logs = db.dailyLogs
    .filter((l) => l.activityId === activityId)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (logs.every((l) => l.status === "submitted")) {
    act.status = "completed";
    return;
  }
  const today = iso(now);
  const anyMissed = logs.some((l) => l.status === "pending" && l.date < today);
  act.status = anyMissed ? "missed" : "pending";
}

export function createActivity(
  db: TrakDb,
  input: CreateActivityInput,
  now: Date,
): Activity {
  const id = uid("act");
  const act: Activity = {
    id,
    title: input.title,
    type: input.type,
    description: input.description,
    createdBy: input.createdBy,
    delegatedBy: input.delegatedBy ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime ?? "",
    responsibilityIds: input.responsibilityIds,
    location: input.location ?? "",
    status: "pending",
    createdAt: input.seedDate || iso(now),
    initiativeTeamwork: "",
    challenges: "",
    outcomes: "",
    nextSteps: "",
    hasBudget: input.hasBudget ?? false,
    estimatedAmountNgn: input.estimatedAmountNgn ?? null,
    hidden: false,
    softDeletedAt: null,
  };
  db.activities.push(act);
  const nDays = daysBetween(input.startDate, input.endDate) + 1;
  for (let i = 0; i < nDays; i++) {
    const log: DailyLog = {
      id: uid("log"),
      activityId: id,
      date: iso(addDays(new Date(input.startDate + "T00:00:00Z"), i)),
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
    };
    db.dailyLogs.push(log);
  }
  recomputeStatus(db, act.id, now);
  return act;
}

export function submitDailyLog(
  db: TrakDb,
  activityId: string,
  date: string,
  data: SubmitDailyLogData,
  now: Date,
): void {
  const log = db.dailyLogs.find(
    (l) => l.activityId === activityId && l.date === date,
  );
  if (!log) return;
  Object.assign(log, {
    objectives: data.objectives,
    activityDescription: data.activityDescription,
    transcript: data.transcript,
    attendanceCount: data.attendanceCount,
    attendanceNotes: data.attendanceNotes,
    attendees: data.attendees,
    attachments: data.attachments,
    amountReleasedNgn: data.amountReleasedNgn ?? null,
    amountSpentNgn: data.amountSpentNgn ?? null,
    spendingItems: data.spendingItems ?? [],
    status: "submitted" as const,
    submittedAt: iso(now),
  });
  recomputeStatus(db, activityId, now);
}

export function updateActivityWrapup(
  db: TrakDb,
  activityId: string,
  data: WrapupData,
): void {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act) return;
  (Object.keys(data) as (keyof WrapupData)[]).forEach((k) => {
    const v = data[k];
    if (v && v.trim()) act[k] = v.trim();
  });
}

export function pushNotification(
  db: TrakDb,
  userId: string,
  type: NotifType,
  text: string,
  now: Date,
  activityId?: string | null,
): Notification {
  const n: Notification = {
    id: uid("nt"),
    userId,
    type,
    text,
    activityId: activityId ?? null,
    createdAt: iso(now),
    read: false,
  };
  db.notifications.push(n);
  return n;
}

export function activitiesFor(db: TrakDb, userId: string): Activity[] {
  return db.activities.filter(
    (a) => a.createdBy === userId && !a.softDeletedAt,
  );
}

export function bucket(db: TrakDb, userId: string) {
  const acts = activitiesFor(db, userId);
  return {
    pending: acts.filter((a) => a.status === "pending"),
    completed: acts.filter((a) => a.status === "completed"),
    missed: acts.filter((a) => a.status === "missed"),
  };
}

export function allVisibleActivities(db: TrakDb): Activity[] {
  return db.activities.filter((a) => !a.softDeletedAt);
}

export function toggleActivityHidden(
  db: TrakDb,
  activityId: string,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act) return null;
  act.hidden = !act.hidden;
  return act;
}

export function softDeleteActivity(
  db: TrakDb,
  activityId: string,
  now: Date,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act) return null;
  act.softDeletedAt = iso(now);
  return act;
}

export function deactivateResponsibility(
  responsibilities: Responsibility[],
  id: string,
): Responsibility | null {
  const r = responsibilities.find((x) => x.id === id);
  if (!r) return null;
  r.isActive = !r.isActive;
  return r;
}
