/**
 * Offline optimistic objects (Phase 2) — pure builders for the temporary
 * client-side copies created when a mutation is queued instead of sent.
 *
 * Temp objects use `temp_<timestamp>_<random>` ids. They are replaced by
 * the authoritative server copies on the next successful bootstrap
 * refresh after the outbox drains, so they only need to satisfy the
 * client-side `TrakDb` shapes used for rendering — never the server.
 */

import type {
  Activity,
  Announcement,
  Attendee,
  Broadcast,
  Comment,
  CreateActivityInput,
  DailyLog,
  Responsibility,
  SubmitDailyLogData,
} from "@/lib/types";
import { DEFAULT_UNIT_ID } from "@/lib/announcements";

let tempCounter = 0;

/** Unique client-side temp id for optimistically-created objects. */
export function newTempId(prefix = "temp"): string {
  tempCounter += 1;
  const rand = Math.floor(Math.random() * 1_000_000_000);
  return `${prefix}_${Date.now()}_${tempCounter}_${rand}`;
}

/** True for client-side temp ids that have no server counterpart yet. */
export function isTempId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("temp_");
}

export type CreateActivityBody = Omit<CreateActivityInput, "createdBy"> & {
  createdBy: string;
};

/** Temp activity shown immediately when creation is queued offline. */
export function buildOfflineActivity(
  input: CreateActivityBody,
  tempId: string = newTempId(),
): Activity {
  const now = new Date().toISOString();
  const collaborative = input.collaborative === true;
  return {
    id: tempId,
    title: input.title,
    type: input.type,
    description: input.description ?? "",
    createdBy: input.createdBy,
    delegatedBy: input.delegatedBy ?? null,
    assigneeId: input.assigneeId ?? null,
    delegationType: input.delegationType ?? null,
    libraryResourceId: input.libraryResourceId ?? null,
    innovationId: input.innovationId ?? null,
    collaborative,
    collaborators: collaborative
      ? (input.collaboratorIds ?? []).map((userId) => ({
          id: newTempId("col"),
          activityId: tempId,
          userId,
          invitedById: input.createdBy,
          status: "pending" as const,
          respondedAt: null,
          createdAt: now,
        }))
      : [],
    startDate: input.startDate,
    endDate: input.endDate,
    startTime: input.startTime,
    endTime: input.endTime ?? "",
    responsibilityIds: input.responsibilityIds ?? [],
    location: input.location ?? "",
    status: "pending",
    exceptionStatus: "none",
    exceptionReason: "",
    submissionType: "normal",
    gracePeriodStartedAt: null,
    gracePeriodExpiresAt: null,
    dueAt: input.defaultDueAt ?? null,
    reminderStatus: {},
    reminderVersion: 0,
    createdAt: now,
    initiativeTeamwork: "",
    challenges: "",
    outcomes: "",
    nextSteps: "",
    hasBudget: input.hasBudget ?? false,
    estimatedAmountNgn: input.estimatedAmountNgn ?? null,
    hidden: false,
    softDeletedAt: null,
  };
}

/** Temp daily log when no local log exists yet for (activityId, date). */
export function buildOfflineDailyLog(
  activityId: string,
  date: string,
  data: SubmitDailyLogData,
  tempId: string = newTempId(),
): DailyLog {
  return {
    id: tempId,
    activityId,
    userId: data.userId ?? null,
    date,
    objectives: data.objectives ?? "",
    activityDescription: data.activityDescription ?? "",
    transcript: data.transcript ?? "",
    attendanceCount: data.attendanceCount ?? "",
    attendanceNotes: data.attendanceNotes ?? "",
    attendees: data.attendees ?? [],
    rsvpToken: null,
    attachments: data.attachments ?? [],
    status: "submitted",
    submittedAt: new Date().toISOString(),
    amountReleasedNgn: data.amountReleasedNgn ?? null,
    amountSpentNgn: data.amountSpentNgn ?? null,
    spendingItems: data.spendingItems ?? [],
  };
}

/** Merge submitted fields into an existing local log (offline optimistic). */
export function mergeOfflineDailyLog(
  existing: DailyLog,
  data: SubmitDailyLogData,
): DailyLog {
  return {
    ...existing,
    ...(data.userId !== undefined ? { userId: data.userId } : {}),
    ...(data.objectives !== undefined ? { objectives: data.objectives } : {}),
    ...(data.activityDescription !== undefined
      ? { activityDescription: data.activityDescription }
      : {}),
    ...(data.transcript !== undefined ? { transcript: data.transcript } : {}),
    ...(data.attendanceCount !== undefined
      ? { attendanceCount: data.attendanceCount }
      : {}),
    ...(data.attendanceNotes !== undefined
      ? { attendanceNotes: data.attendanceNotes }
      : {}),
    ...(data.attendees !== undefined ? { attendees: data.attendees } : {}),
    ...(data.attachments !== undefined
      ? { attachments: data.attachments }
      : {}),
    ...(data.amountReleasedNgn !== undefined
      ? { amountReleasedNgn: data.amountReleasedNgn }
      : {}),
    ...(data.amountSpentNgn !== undefined
      ? { amountSpentNgn: data.amountSpentNgn }
      : {}),
    ...(data.spendingItems !== undefined
      ? { spendingItems: data.spendingItems }
      : {}),
    status: "submitted",
    submittedAt: existing.submittedAt ?? new Date().toISOString(),
  };
}

/** Temp comment shown immediately when commenting offline. */
export function buildOfflineComment(
  activityId: string,
  authorId: string,
  text: string,
  tempId: string = newTempId(),
): Comment {
  return {
    id: tempId,
    activityId,
    authorId,
    text,
    createdAt: new Date().toISOString(),
  };
}

/** Temp broadcast shown immediately when broadcasting offline. */
export function buildOfflineBroadcast(
  from: string,
  text: string,
  tempId: string = newTempId(),
): Broadcast {
  return {
    id: tempId,
    from,
    text,
    at: new Date().toISOString(),
  };
}

/** Temp announcement shown immediately when announcing offline. */
export function buildOfflineAnnouncement(
  from: string,
  text: string,
  tempId: string = newTempId(),
): Announcement {
  return {
    id: tempId,
    unitId: DEFAULT_UNIT_ID,
    from,
    text,
    at: new Date().toISOString(),
    reactions: [],
  };
}

/** Temp responsibility shown immediately when creation is queued offline. */
export function buildOfflineResponsibility(
  input: { code: string; name: string; desc: string; deliverables: string[] },
  tempId: string = newTempId(),
): Responsibility {
  return {
    id: tempId,
    code: input.code,
    name: input.name,
    desc: input.desc,
    deliverables: input.deliverables,
    isActive: true,
  };
}

/** Optimistic RSVP attendee appended to the local log while offline. */
export function buildOfflineAttendee(attendee: Attendee): Attendee {
  return {
    ...attendee,
    source: attendee.source ?? "manual",
    status: "pending",
  };
}
