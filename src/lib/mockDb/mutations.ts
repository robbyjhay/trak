import { addDays, daysBetween, iso } from "@/lib/dates";
import type {
  Activity,
  CreateActivityInput,
  DailyLog,
  Notification,
  NotifType,
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
  Object.assign(log, data, {
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
  return db.activities.filter((a) => a.createdBy === userId);
}

export function bucket(db: TrakDb, userId: string) {
  const acts = activitiesFor(db, userId);
  return {
    pending: acts.filter((a) => a.status === "pending"),
    completed: acts.filter((a) => a.status === "completed"),
    missed: acts.filter((a) => a.status === "missed"),
  };
}
