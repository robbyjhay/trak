/**
 * Map Prisma rows → client DTOs (src/lib/types).
 * Never expose passwordHash, rsvpTokenHash, or other secrets.
 */
import type {
  Activity as DbActivity,
  ActivityResponsibility,
  Attachment as DbAttachment,
  Attendee as DbAttendee,
  Broadcast as DbBroadcast,
  CallRecord as DbCall,
  Comment as DbComment,
  CommunityMessage as DbCommunity,
  DailyLog as DbDailyLog,
  DirectMessage as DbDm,
  Notification as DbNotification,
  Responsibility as DbResponsibility,
  User as DbUser,
  UserProfile,
} from "@prisma/client";
import type {
  Activity,
  Attachment,
  Attendee,
  Broadcast,
  CallRecord,
  Comment,
  CommunityMessage,
  DailyLog,
  Dm,
  Notification,
  NotifType,
  Responsibility,
  SpendingItem,
  User,
} from "@/lib/types";

function dateOnly(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function decimalToNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSpendingItems(raw: unknown): SpendingItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const description = String(o.description ?? "");
      const amount = Number(o.amount ?? 0);
      if (!description) return null;
      return { description, amount: Number.isFinite(amount) ? amount : 0 };
    })
    .filter(Boolean) as SpendingItem[];
}

function parseDeliverables(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => String(d)).filter(Boolean);
}

export type UserWithProfile = DbUser & { profile: UserProfile | null };

export function mapUser(row: UserWithProfile): User {
  const p = row.profile;
  return {
    id: row.id,
    name: p?.name ?? row.username,
    username: row.username,
    role: row.role === "head" ? "head" : "member",
    isSecretary: row.isSecretary,
    isCorps: row.isCorps,
    corpsEnd: p?.corpsEnd ? dateOnly(p.corpsEnd) : undefined,
    color: p?.color ?? "#0e6b47",
    phone: p?.phone ?? "",
    designation: p?.designation ?? "",
    gradeLevel: p?.gradeLevel ?? "",
    sex: p?.sex ?? "",
    stateOfOrigin: p?.stateOfOrigin ?? "",
    dateJoined: p?.dateJoined ? dateOnly(p.dateJoined) : "",
    photoUrl: p?.photoKey ?? null,
  };
}

export function mapResponsibility(row: DbResponsibility): Responsibility {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    desc: row.description,
    deliverables: parseDeliverables(row.deliverables),
    isActive: row.isActive,
  };
}

export type ActivityWithRelations = DbActivity & {
  responsibilities?: ActivityResponsibility[];
};

export function mapActivity(row: ActivityWithRelations): Activity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    createdBy: row.createdById,
    delegatedBy: row.delegatedById,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    startTime: row.startTime,
    endTime: row.endTime,
    responsibilityIds: (row.responsibilities ?? []).map(
      (r) => r.responsibilityId,
    ),
    location: row.location,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    initiativeTeamwork: row.initiativeTeamwork,
    challenges: row.challenges,
    outcomes: row.outcomes,
    nextSteps: row.nextSteps,
    hasBudget: row.hasBudget,
    estimatedAmountNgn: decimalToNumber(row.estimatedAmountNgn),
    hidden: row.hidden,
    softDeletedAt: row.softDeletedAt ? row.softDeletedAt.toISOString() : null,
  };
}

export type DailyLogWithRelations = DbDailyLog & {
  attendees?: DbAttendee[];
  attachments?: DbAttachment[];
};

export function mapAttendee(row: DbAttendee): Attendee {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    at: row.registeredAt?.toISOString() ?? row.createdAt.toISOString(),
  };
}

export function mapAttachment(row: DbAttachment): Attachment {
  return {
    name: row.name,
    size: row.size,
    type: row.contentType,
    url: row.storageKey,
    kind: row.kind,
  };
}

export function mapDailyLog(row: DailyLogWithRelations): DailyLog {
  return {
    id: row.id,
    activityId: row.activityId,
    date: dateOnly(row.date),
    objectives: row.objectives,
    activityDescription: row.activityDescription,
    transcript: row.transcript,
    attendanceCount: row.attendanceCount,
    attendanceNotes: row.attendanceNotes,
    attendees: (row.attendees ?? []).map(mapAttendee),
    // Raw token never leaves the server; client only knows if one exists.
    rsvpToken: row.rsvpTokenHash ? "set" : null,
    attachments: (row.attachments ?? []).map(mapAttachment),
    status: row.status,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    amountReleasedNgn: decimalToNumber(row.amountReleasedNgn),
    amountSpentNgn: decimalToNumber(row.amountSpentNgn),
    spendingItems: parseSpendingItems(row.spendingItems),
  };
}

export function mapComment(row: DbComment): Comment {
  return {
    id: row.id,
    activityId: row.activityId,
    authorId: row.authorId,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapDm(row: DbDm): Dm {
  return {
    id: row.id,
    a: row.participantA,
    b: row.participantB,
    from: row.fromUserId,
    text: row.text,
    at: row.createdAt.toISOString(),
  };
}

export function mapCommunity(row: DbCommunity): CommunityMessage {
  return {
    id: row.id,
    from: row.fromUserId,
    text: row.text,
    at: row.createdAt.toISOString(),
    replyToId: row.replyToId,
  };
}

export function mapBroadcast(row: DbBroadcast): Broadcast {
  return {
    id: row.id,
    from: row.fromUserId,
    text: row.text,
    at: row.createdAt.toISOString(),
  };
}

export function mapCall(row: DbCall): CallRecord {
  return {
    id: row.id,
    a: row.participantA,
    b: row.participantB,
    from: row.fromUserId,
    durationSec: row.durationSec,
    at: row.createdAt.toISOString(),
  };
}

export function mapNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotifType,
    text: row.text,
    activityId: row.activityId,
    createdAt: row.createdAt.toISOString(),
    read: Boolean(row.readAt),
  };
}
