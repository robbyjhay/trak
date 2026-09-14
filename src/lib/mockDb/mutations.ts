import { addDays, daysBetween, iso } from "@/lib/dates";
import { isActivityRecoveryEnabled } from "@/lib/activityRecovery";
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
    announcements: [],
    notifications: [],
  };
}

export function recomputeStatus(db: TrakDb, activityId: string, now: Date): void {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act) return;
  const logs = db.dailyLogs
    .filter((l) => l.activityId === activityId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const groups = act.collaborative
    ? collaborativeLogGroups(logs)
    : [logs];

  if (groups.length > 0 && groups.every((g) => g.every((l) => l.status === "submitted"))) {
    act.status = "completed";
    return;
  }
  if (!isActivityRecoveryEnabled()) {
    const today = iso(now);
    const anyMissed = groups.some((g) =>
      g.some((l) => l.status === "pending" && l.date < today),
    );
    act.status = anyMissed ? "missed" : "pending";
    if (act.status === "missed") {
      act.exceptionStatus = "none";
      act.exceptionReason = "";
      act.submissionType = "normal";
      act.gracePeriodStartedAt = null;
      act.gracePeriodExpiresAt = null;
    }
  }
}

function collaborativeLogGroups(logs: DailyLog[]): DailyLog[][] {
  const byUser = new Map<string, DailyLog[]>();
  for (const l of logs) {
    if (!l.userId) continue;
    const arr = byUser.get(l.userId) ?? [];
    arr.push(l);
    byUser.set(l.userId, arr);
  }
  return [...byUser.values()];
}

export function createActivity(
  db: TrakDb,
  input: CreateActivityInput,
  now: Date,
): Activity {
  const id = uid("act");
  const collaborative = input.collaborative === true;
  const act: Activity = {
    id,
    title: input.title,
    type: input.type,
    description: input.description,
    createdBy: input.createdBy,
    delegatedBy: input.delegatedBy ?? null,
    assigneeId: input.assigneeId ?? null,
    delegationType: input.delegationType ?? null,
    libraryResourceId: input.libraryResourceId ?? null,
    innovationId: input.innovationId ?? null,
    collaborative,
    collaborators: collaborative
      ? (input.collaboratorIds ?? []).map((userId) => ({
          id: uid("col"),
          activityId: id,
          userId,
          invitedById: input.createdBy,
          status: "pending" as const,
          respondedAt: null,
          createdAt: iso(now),
        }))
      : [],
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime ?? "",
    responsibilityIds: input.responsibilityIds,
    location: input.location ?? "",
    status: "pending",
    exceptionStatus: "none",
    exceptionReason: "",
    submissionType: "normal",
    gracePeriodStartedAt: null,
    gracePeriodExpiresAt: null,
    createdAt: input.seedDate || iso(now),
    initiativeTeamwork: "",
    challenges: "",
    outcomes: "",
    nextSteps: "",
    hasBudget: input.hasBudget ?? false,
    estimatedAmountNgn: input.estimatedAmountNgn ?? null,
    hidden: false,
    softDeletedAt: null,
    dueAt: null,
    reminderStatus: {},
    reminderVersion: 1,
  };
  db.activities.push(act);
  const nDays = daysBetween(input.startDate, input.endDate) + 1;
  for (let i = 0; i < nDays; i++) {
    const log: DailyLog = {
      id: uid("log"),
      activityId: id,
      userId: collaborative ? input.createdBy : null,
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
  for (const cid of input.collaboratorIds ?? []) {
    pushNotification(
      db,
      cid,
      "collaboration_invite",
      `You were invited to collaborate on "${act.title}".`,
      now,
      act.id,
    );
  }
  recomputeStatus(db, act.id, now);
  return act;
}

/** Accept/decline a collaboration invite in the mock store (mirrors server). */
export function respondToCollab(
  db: TrakDb,
  activityId: string,
  userId: string,
  action: "accept" | "decline",
  now: Date,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act || !act.collaborative || act.softDeletedAt) return null;
  const col = act.collaborators?.find((c) => c.userId === userId);
  if (!col || col.status !== "pending") return null;

  col.status = action === "accept" ? "accepted" : "declined";
  col.respondedAt = iso(now);

  if (action === "accept") {
    const nDays = daysBetween(act.startDate, act.endDate) + 1;
    for (let i = 0; i < nDays; i++) {
      const date = iso(addDays(new Date(act.startDate + "T00:00:00Z"), i));
      const exists = db.dailyLogs.some(
        (l) => l.activityId === activityId && l.userId === userId && l.date === date,
      );
      if (!exists) {
        db.dailyLogs.push({
          id: uid("log"),
          activityId,
          userId,
          date,
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
      }
    }
    pushNotification(
      db,
      act.createdBy,
      "collaboration_accepted",
      `A member accepted your invite to collaborate on "${act.title}".`,
      now,
      activityId,
    );
  } else {
    pushNotification(
      db,
      act.createdBy,
      "collaboration_declined",
      `A member declined the invite to collaborate on "${act.title}".`,
      now,
      activityId,
    );
  }
  return act;
}

export function submitDailyLog(
  db: TrakDb,
  activityId: string,
  date: string,
  data: SubmitDailyLogData,
  now: Date,
  userId: string | null = null,
): void {
  const act = db.activities.find((a) => a.id === activityId);
  const wasMissed = act?.status === "missed";
  const log = db.dailyLogs.find(
    (l) =>
      l.activityId === activityId &&
      l.date === date &&
      (l.userId ?? null) === (userId ?? null),
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
  if (wasMissed && act) {
    act.submissionType = "late";
    act.gracePeriodExpiresAt = null;
    act.exceptionStatus = act.exceptionStatus === "approved" ? "approved" : act.exceptionStatus;
  }
  recomputeStatus(db, activityId, now);
}

export function recoverMissedActivities(db: TrakDb): { recovered: number } {
  if (!isActivityRecoveryEnabled()) return { recovered: 0 };
  let recovered = 0;
  for (const act of db.activities) {
    if (act.status !== "missed" || act.softDeletedAt) continue;
    const logs = db.dailyLogs.filter((l) => l.activityId === act.id);
    const hasPending = logs.some((l) => l.status === "pending");
    if (!hasPending) continue;
    act.status = "pending";
    act.exceptionStatus = "none";
    act.exceptionReason = "";
    act.submissionType = "normal";
    act.gracePeriodStartedAt = null;
    act.gracePeriodExpiresAt = null;
    recovered++;
  }
  return { recovered };
}

export function requestException(
  db: TrakDb,
  activityId: string,
  explanation: string,
  now: Date,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act || act.status !== "missed") return null;
  if (act.exceptionStatus === "requested") return null;
  act.exceptionStatus = "requested";
  act.exceptionReason = explanation;
  return act;
}

export function approveException(
  db: TrakDb,
  activityId: string,
  now: Date,
  durationMs = 2 * 60 * 60 * 1000,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act || act.exceptionStatus !== "requested") return null;
  act.exceptionStatus = "approved";
  act.gracePeriodStartedAt = now;
  act.gracePeriodExpiresAt = new Date(now.getTime() + durationMs);
  return act;
}

export function rejectException(
  db: TrakDb,
  activityId: string,
): Activity | null {
  const act = db.activities.find((a) => a.id === activityId);
  if (!act || act.exceptionStatus !== "requested") return null;
  act.exceptionStatus = "rejected";
  return act;
}

export function expireExceptions(db: TrakDb, now: Date): void {
  for (const act of db.activities) {
    if (
      act.exceptionStatus === "approved" &&
      act.status === "missed" &&
      act.gracePeriodExpiresAt &&
      now > act.gracePeriodExpiresAt
    ) {
      act.exceptionStatus = "expired";
    }
  }
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
  return db.activities.filter((a) => {
    if (a.softDeletedAt) return false;
    if (a.createdBy === userId || a.assigneeId === userId) return true;
    return Boolean(
      a.collaborators?.some(
        (c) => c.userId === userId && c.status === "accepted",
      ),
    );
  });
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
