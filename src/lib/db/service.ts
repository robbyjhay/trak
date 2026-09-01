import { sendPushNotification } from "@/lib/pushServer";
/**
 * Domain service layer — PostgreSQL via Prisma (Phase 1+).
 * Replaces the legacy JSON file store for all product data.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { addDays, createNow, daysBetween, iso } from "@/lib/dates";
import {
  canBroadcast,
  canComment,
  canDelegate,
  canManageResponsibilities,
  canManageTeamProfiles,
  canWipeCommunity,
} from "@/lib/permissions";
import { firstName, nextMemberColor, suggestUsername } from "@/lib/utils";
import {
  generateTemporaryPassword,
  hashPassword,
} from "@/lib/auth/password";
import { recordAuditEvent } from "@/lib/services/audit.service";
import {
  mapActivity,
  mapBroadcast,
  mapCall,
  mapComment,
  mapCommunity,
  mapDailyLog,
  mapDm,
  mapNotification,
  mapResponsibility,
  mapUser,
  type UserWithProfile,
} from "@/lib/db/mappers";
import { getDefaultMemberPassword } from "@/lib/services/settings.service";
import type {
  Activity,
  Attendee,
  Comment,
  CreateActivityInput,
  DailyLog,
  Notification,
  Responsibility,
  SessionUser,
  SubmitDailyLogData,
  User,
  WrapupData,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): Date {
  return createNow();
}

function dateFromIso(s: string): Date {
  return new Date(s.slice(0, 10) + "T00:00:00.000Z");
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

async function requireActor(session: SessionUser): Promise<UserWithProfile> {
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { profile: true },
  });
  if (!user || !user.isActive) {
    throw new ServiceError(401, "Unauthorized");
  }
  return user;
}

async function findHeadUserId(): Promise<string | null> {
  const head = await prisma.user.findFirst({
    where: { role: "head", isActive: true },
    select: { id: true },
  });
  return head?.id ?? null;
}

const activityInclude = {
  responsibilities: true,
} as const;

const logInclude = {
  attendees: true,
  attachments: true,
} as const;

async function recomputeActivityStatus(
  activityId: string,
  reference: Date = now(),
): Promise<void> {
  const logs = await prisma.dailyLog.findMany({
    where: { activityId },
    select: { status: true, date: true },
  });
  if (logs.length === 0) return;

  let status: "pending" | "completed" | "missed" = "pending";
  if (logs.every((l) => l.status === "submitted")) {
    status = "completed";
  } else {
    const today = iso(reference);
    const anyMissed = logs.some(
      (l) => l.status === "pending" && iso(l.date) < today,
    );
    status = anyMissed ? "missed" : "pending";
  }

  await prisma.activity.update({
    where: { id: activityId },
    data: { status },
  });
}

async function pushNotification(
  userId: string,
  type: Notification["type"],
  text: string,
  activityId?: string | null,
  messageId?: string | null,
): Promise<void> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  if (prefs && type !== 'broadcast') {
    if (!prefs.notificationsEnabled) return;
    if (type === 'dm' && !prefs.dmNotifications) return;
    if (['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'].includes(type) && !prefs.activityNotifications) return;
  }
  await prisma.notification.create({
    data: {
      userId,
      type,
      text,
      activityId: activityId ?? null,
      messageId: messageId ?? null,
    },
  });

  let title = "TRAK";
  let url = "/dashboard";

  if (type === "dm") {
    title = "New Message";
    url = "/messages";
  } else if (type === "broadcast") {
    title = "📢 Unit Announcement";
    url = "/messages";
  } else if (type === "mention") {
    title = "You were mentioned";
    url = "/messages";
  } else if (type.startsWith("activity_") || type === "comment") {
    title = "Activity Update";
    url = activityId ? `/activities/${activityId}` : "/activities";
  }

  sendPushNotification(userId, title, text, { url }).catch(console.error);
}

function publicStorageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("data:") ||
    key.startsWith("/")
  ) {
    return key;
  }
  const base = process.env.S3_PUBLIC_BASE_URL || process.env.APP_URL || "";
  if (!base) return key;
  return `${base.replace(/\/$/, "")}/uploads/${key}`;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({
    include: { profile: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => {
    const u = mapUser(r);
    u.photoUrl = publicStorageUrl(u.photoUrl);
    return u;
  });
}

export async function getUser(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!row) return null;
  const u = mapUser(row);
  u.photoUrl = publicStorageUrl(u.photoUrl);
  return u;
}

export type ProfilePatch = Partial<
  Pick<
    User,
    | "designation"
    | "gradeLevel"
    | "sex"
    | "phone"
    | "stateOfOrigin"
    | "dateJoined"
    | "photoUrl"
    | "role"
    | "isSecretary"
    | "isCorps"
    | "isIntern"
    | "corpsEnd"
    | "isActive"
  >
>;

export async function updateUserProfile(
  session: SessionUser,
  userId: string,
  patch: ProfilePatch,
): Promise<User> {
  const actor = await requireActor(session);
  if (userId !== session.id && !canManageTeamProfiles(mapUser(actor))) {
    throw new ServiceError(403, "Not allowed to edit this profile.");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!existing) throw new ServiceError(404, "User not found.");

  const data: Prisma.UserProfileUpdateInput = {};
  if (patch.designation !== undefined) data.designation = patch.designation;
  if (patch.gradeLevel !== undefined) data.gradeLevel = patch.gradeLevel;
  if (patch.sex !== undefined) data.sex = patch.sex;
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.stateOfOrigin !== undefined) data.stateOfOrigin = patch.stateOfOrigin;
  if (patch.dateJoined !== undefined) {
    data.dateJoined = patch.dateJoined
      ? dateFromIso(patch.dateJoined)
      : null;
  }
  if (patch.photoUrl !== undefined) data.photoKey = patch.photoUrl;

  const updateData: Prisma.UserUpdateInput = {
    profile: {
      upsert: {
        create: {
          name: existing.profile?.name ?? existing.username,
          designation: patch.designation ?? "",
          gradeLevel: patch.gradeLevel ?? "",
          sex: patch.sex ?? "",
          phone: patch.phone ?? "",
          stateOfOrigin: patch.stateOfOrigin ?? "",
          dateJoined: patch.dateJoined ? dateFromIso(patch.dateJoined) : null,
          photoKey: patch.photoUrl ?? null,
          corpsEnd: patch.corpsEnd ? dateFromIso(patch.corpsEnd) : null,
        },
        update: {
          ...data,
          ...(patch.corpsEnd !== undefined ? { corpsEnd: patch.corpsEnd ? dateFromIso(patch.corpsEnd) : null } : {}),
        },
      },
    },
  };

  if (canManageTeamProfiles(mapUser(actor))) {
    if (patch.role !== undefined) updateData.role = patch.role;
    if (patch.isSecretary !== undefined) updateData.isSecretary = patch.isSecretary;
    if (patch.isCorps !== undefined) updateData.isCorps = patch.isCorps;
    if (patch.isIntern !== undefined) updateData.isIntern = patch.isIntern;
    if (patch.isActive !== undefined) {
      if (!patch.isActive && userId === session.authUserId) {
        throw new ServiceError(400, "You cannot deactivate your own account.");
      }
      updateData.isActive = patch.isActive;
      if (!patch.isActive) {
        // Revoke sessions
        await prisma.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: { profile: true },
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "user_update",
    targetId: userId,
    targetType: "user",
  });

  const u = mapUser(updated);
  u.photoUrl = publicStorageUrl(u.photoUrl);
  return u;
}

export type NewUserInput = {
  name: string;
  username?: string;
  email?: string;
  designation?: string;
  gradeLevel?: string;
  sex?: string;
  phone?: string;
  stateOfOrigin?: string;
  dateJoined?: string;
  roleType?: "member" | "secretary" | "corps" | "intern";
};

export interface CreatedUserCredentials {
  username: string;
  starterPassword: string;
}

export async function createUser(
  session: SessionUser,
  input: NewUserInput,
): Promise<{ user: User; credentials: CreatedUserCredentials }> {
  const actor = await requireActor(session);
  if (!canManageTeamProfiles(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can add members.");
  }

  const name = (input.name || "").trim();
  const phone = (input.phone || "").trim();
  if (!name || !phone) {
    throw new ServiceError(400, "Full name and phone are required.");
  }

  const emailRaw = (input.email || "").trim().toLowerCase();
  const email = emailRaw || null;
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ServiceError(400, "Enter a valid email address.");
    }
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      throw new ServiceError(409, "That email is already in use.");
    }
  }

  const existing = await prisma.user.findMany({
    select: { username: true, profile: { select: { color: true } } },
  });
  const existingUsernames = existing.map((u) => u.username);
  const username =
    (input.username || "").trim() || suggestUsername(name, existingUsernames);
  const normalized = username.toLowerCase();

  if (await prisma.user.findUnique({ where: { usernameNormalized: normalized } })) {
    throw new ServiceError(409, "That username is already in use.");
  }

  const roleType = input.roleType || "member";
  
  let starterPassword = await getDefaultMemberPassword();
  if (!starterPassword) {
    throw new ServiceError(400, "Cannot create member: No default password is configured.");
  }
  
  const passwordHash = await hashPassword(starterPassword);
  const colors = existing.map((u) => u.profile?.color || "#0e6b47");

  const created = await prisma.user.create({
    data: {
      username,
      usernameNormalized: normalized,
      email,
      passwordHash,
      role: "member",
      isSecretary: roleType === "secretary",
      isCorps: roleType === "corps",
      isIntern: roleType === "intern",
      mustChangePassword: true,
      isActive: true,
      profile: {
        create: {
          name,
          phone,
          designation: (input.designation || "").trim(),
          gradeLevel: (input.gradeLevel || "").trim(),
          sex: input.sex || "",
          stateOfOrigin: (input.stateOfOrigin || "").trim(),
          dateJoined: input.dateJoined ? dateFromIso(input.dateJoined) : null,
          color: nextMemberColor(colors),
          corpsEnd: roleType === "corps" ? null : null,
        },
      },
      preferences: { create: {} },
    },
    include: { profile: true },
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "user_create",
    targetId: created.id,
    targetType: "user",
    meta: { username: created.username, email: email || undefined },
  });

  // Prefer invite email when an address is on file (AUDIT_05 / Phase 4).
  if (email) {
    try {
      const { createAuthToken } = await import("@/lib/auth/tokens");
      const { rawToken } = await createAuthToken("invite", created.id);
      const { sendInviteEmail } = await import(
        "@/lib/services/email.service"
      );
      await sendInviteEmail(email, rawToken, {
        username: created.username,
        name,
      });
      await recordAuditEvent({
        userId: session.authUserId,
        action: "invite_create",
        targetId: created.id,
        targetType: "user",
        meta: { email },
      });
    } catch {
      // Invite email is best-effort; Unit Head still receives starter password once.
    }
  }

  return {
    user: mapUser(created),
    credentials: { username: created.username, starterPassword },
  };
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export async function listActivitiesForSession(
  session: SessionUser,
  opts?: { page?: number; limit?: number; includeHidden?: boolean },
): Promise<{ activities: Activity[]; total: number }> {
  const actor = await requireActor(session);
  const page = opts?.page ?? 1;
  const limit = Math.min(opts?.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ActivityWhereInput = {
    softDeletedAt: null,
  };

  if (actor.role !== "head") {
    where.createdById = session.id;
    where.hidden = false;
  } else if (!opts?.includeHidden) {
    // Head sees all non-deleted; hidden still visible to head
  }

  const [rows, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities: rows.map(mapActivity), total };
}

export async function createActivity(
  session: SessionUser,
  input: Omit<CreateActivityInput, "createdBy"> & {
    createdBy?: string;
    delegatedBy?: string | null;
  },
): Promise<Activity> {
  const actor = await requireActor(session);
  const createdBy = input.createdBy || session.id;

  if (createdBy !== session.id && !canDelegate(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can delegate activities.");
  }
  if (input.delegatedBy && !canDelegate(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can set delegatedBy.");
  }

  if (!input.title?.trim()) {
    throw new ServiceError(400, "Title is required");
  }
  if (!input.startDate || !input.endDate || !input.startTime) {
    throw new ServiceError(400, "Missing required activity fields");
  }
  if (input.endDate < input.startDate) {
    throw new ServiceError(400, "endDate must be on or after startDate");
  }

  const nDays = daysBetween(input.startDate, input.endDate) + 1;
  if (nDays > 90) {
    throw new ServiceError(400, "Activity span cannot exceed 90 days");
  }

  const respIds = input.responsibilityIds || [];
  const act = await prisma.$transaction(async (tx) => {
    const created = await tx.activity.create({
      data: {
        title: input.title.trim(),
        type: input.type,
        description: input.description || "",
        createdById: createdBy,
        delegatedById: input.delegatedBy ?? null,
        startDate: dateFromIso(input.startDate),
        endDate: dateFromIso(input.endDate),
        startTime: input.startTime,
        endTime: input.endTime ?? "",
        location: input.location ?? "",
        hasBudget: input.hasBudget ?? false,
        estimatedAmountNgn:
          input.estimatedAmountNgn != null
            ? new Prisma.Decimal(input.estimatedAmountNgn)
            : null,
        createdAt: input.seedDate
          ? new Date(input.seedDate)
          : undefined,
        responsibilities: {
          create: respIds.map((responsibilityId) => ({ responsibilityId })),
        },
        dailyLogs: {
          create: Array.from({ length: nDays }, (_, i) => ({
            date: dateFromIso(
              iso(addDays(dateFromIso(input.startDate), i)),
            ),
          })),
        },
      },
      include: activityInclude,
    });
    return created;
  });

  await recomputeActivityStatus(act.id);

  const headId = await findHeadUserId();
  if (headId && act.createdById !== headId) {
    const creator = await getUser(act.createdById);
    await pushNotification(
      headId,
      "activity_created",
      `${firstName(creator?.name || session.name)} created a new activity: "${act.title}".`,
      act.id,
    );
  }

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_create",
    targetId: act.id,
    targetType: "activity",
  });

  const refreshed = await prisma.activity.findUniqueOrThrow({
    where: { id: act.id },
    include: activityInclude,
  });
  return mapActivity(refreshed);
}

export async function getActivity(
  session: SessionUser,
  id: string,
): Promise<Activity | null> {
  const actor = await requireActor(session);
  const act = await prisma.activity.findUnique({
    where: { id },
    include: activityInclude,
  });
  if (!act || act.softDeletedAt) return null;
  if (actor.role !== "head" && act.createdById !== session.id) {
    throw new ServiceError(403, "Not allowed to view this activity.");
  }
  return mapActivity(act);
}

export async function getActivityLogs(
  session: SessionUser,
  activityId: string,
): Promise<DailyLog[]> {
  await getActivity(session, activityId); // auth check
  const logs = await prisma.dailyLog.findMany({
    where: { activityId },
    include: logInclude,
    orderBy: { date: "asc" },
  });
  return logs.map(mapDailyLog);
}

export async function getActivityComments(
  session: SessionUser,
  activityId: string,
): Promise<Comment[]> {
  await getActivity(session, activityId);
  const rows = await prisma.comment.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapComment);
}

export async function submitDailyLog(
  session: SessionUser,
  activityId: string,
  date: string,
  data: SubmitDailyLogData,
): Promise<{ log: DailyLog; activity: Activity }> {
  const actor = await requireActor(session);
  const act = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");
  if (act.createdById !== session.id && actor.role !== "head") {
    throw new ServiceError(403, "Not allowed to submit this log.");
  }

  const log = await prisma.dailyLog.findFirst({
    where: { activityId, date: dateFromIso(date) },
    include: logInclude,
  });
  if (!log) throw new ServiceError(404, "Daily log not found.");

  const n = now();
  await prisma.$transaction(async (tx) => {
    await tx.attendee.deleteMany({ where: { dailyLogId: log.id } });
    await tx.attachment.deleteMany({ where: { dailyLogId: log.id } });

    await tx.dailyLog.update({
      where: { id: log.id },
      data: {
        objectives: data.objectives ?? log.objectives,
        activityDescription:
          data.activityDescription ?? log.activityDescription,
        transcript: data.transcript ?? log.transcript,
        attendanceCount: data.attendanceCount ?? log.attendanceCount,
        attendanceNotes: data.attendanceNotes ?? log.attendanceNotes,
        amountReleasedNgn:
          data.amountReleasedNgn != null
            ? new Prisma.Decimal(data.amountReleasedNgn)
            : null,
        amountSpentNgn:
          data.amountSpentNgn != null
            ? new Prisma.Decimal(data.amountSpentNgn)
            : null,
        spendingItems: (data.spendingItems ?? []) as unknown as Prisma.InputJsonValue,
        status: "submitted",
        submittedAt: n,
        attendees: {
          create: (data.attendees ?? []).map((a) => ({
            name: a.name,
            phone: a.phone || "",
            email: a.email || "",
            source: a.source || "manual",
            registeredAt: a.at ? new Date(a.at) : n,
          })),
        },
        attachments: {
          create: (data.attachments ?? []).map((att) => ({
            name: att.name,
            size: att.size || 0,
            contentType: att.type || "application/octet-stream",
            storageKey: att.url || "",
            kind: att.kind === "invoice" ? "invoice" : "evidence",
          })),
        },
      },
    });
  });

  await recomputeActivityStatus(activityId, n);

  const updatedAct = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: activityInclude,
  });
  const updatedLog = await prisma.dailyLog.findUniqueOrThrow({
    where: { id: log.id },
    include: logInclude,
  });

  if (updatedAct.status === "completed") {
    const headId = await findHeadUserId();
    if (headId && updatedAct.createdById !== headId) {
      const owner = await getUser(updatedAct.createdById);
      await pushNotification(
        headId,
        "activity_completed",
        `"${updatedAct.title}" (${firstName(owner?.name || "")}) was just completed.`,
        activityId,
      );
    }
    await recordAuditEvent({
      userId: session.authUserId,
      action: "activity_complete",
      targetId: activityId,
      targetType: "activity",
    });
  }

  return {
    log: mapDailyLog(updatedLog),
    activity: mapActivity(updatedAct),
  };
}
export async function updateActivityEndDate(
  session: SessionUser,
  activityId: string,
  endDate: string,
): Promise<Activity> {
  const actor = await requireActor(session);
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { dailyLogs: true },
  });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");
  if (act.createdById !== session.id && actor.role !== "head") {
    throw new ServiceError(403, "Not allowed to update this activity.");
  }
  if (act.status === "completed") {
    throw new ServiceError(400, "Cannot edit an activity after its report has been submitted.");
  }
  
  const newEnd = dateFromIso(endDate);
  if (newEnd < act.startDate) {
    throw new ServiceError(400, "endDate must be on or after startDate.");
  }

  const nDays = daysBetween(iso(act.startDate), endDate) + 1;
  if (nDays > 90) {
    throw new ServiceError(400, "Activity span cannot exceed 90 days.");
  }

  const requiredDates = Array.from({ length: nDays }, (_, i) => iso(addDays(act.startDate, i)));
  const submittedLogs = act.dailyLogs.filter((l) => l.status === "submitted");

  // Check if there are submitted logs outside the new range
  const submittedDates = submittedLogs.map((l) => iso(l.date));
  for (const d of submittedDates) {
    if (!requiredDates.includes(d)) {
      throw new ServiceError(
        400,
        "Cannot move end date earlier than existing submitted daily logs.",
      );
    }
  }

  const existingDates = act.dailyLogs.map((l) => iso(l.date));
  const missingDates = requiredDates.filter((d) => !existingDates.includes(d));
  const datesToRemove = existingDates.filter((d) => !requiredDates.includes(d));

  const updatedAct = await prisma.$transaction(async (tx) => {
    // Delete pending logs outside range
    if (datesToRemove.length > 0) {
      await tx.dailyLog.deleteMany({
        where: {
          activityId,
          date: { in: datesToRemove.map(dateFromIso) },
          status: "pending",
        },
      });
    }

    // Create missing logs for newly added dates
    if (missingDates.length > 0) {
      await tx.dailyLog.createMany({
        data: missingDates.map((d) => ({
          activityId,
          date: dateFromIso(d),
        })),
      });
    }

    // Update Activity endDate
    return await tx.activity.update({
      where: { id: activityId },
      data: { endDate: newEnd },
      include: activityInclude,
    });
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_update",
    targetId: activityId,
    targetType: "activity",
  });

  await recomputeActivityStatus(activityId);

  const refreshed = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: activityInclude,
  });
  return mapActivity(refreshed);
}

export async function updateActivityMetadata(
  session: SessionUser,
  activityId: string,
  data: {
    title?: string;
    type?: any;
    description?: string;
    startTime?: string;
    location?: string;
    hasBudget?: boolean;
    estimatedAmountNgn?: number | null;
    responsibilityIds?: string[];
  }
): Promise<Activity> {
  const actor = await requireActor(session);
  const act = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");
  if (act.createdById !== session.id && actor.role !== "head") {
    throw new ServiceError(403, "Not allowed to update this activity.");
  }
  if (act.status === "completed") {
    throw new ServiceError(400, "Cannot edit an activity after its report has been submitted.");
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.hasBudget !== undefined) updateData.hasBudget = data.hasBudget;
  if (data.estimatedAmountNgn !== undefined) updateData.estimatedAmountNgn = data.estimatedAmountNgn;

  const updatedAct = await prisma.$transaction(async (tx) => {
    if (data.responsibilityIds) {
      await tx.activityResponsibility.deleteMany({ where: { activityId } });
      if (data.responsibilityIds.length > 0) {
        await tx.activityResponsibility.createMany({
          data: data.responsibilityIds.map((rid: string) => ({
            activityId,
            responsibilityId: rid,
          }))
        });
      }
    }
    return await tx.activity.update({
      where: { id: activityId },
      data: updateData,
      include: activityInclude,
    });
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_update",
    targetId: activityId,
    targetType: "activity",
  });

  return mapActivity(updatedAct);
}


export async function updateActivityWrapup(
  session: SessionUser,
  activityId: string,
  data: WrapupData,
): Promise<Activity> {
  const actor = await requireActor(session);
  const act = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");
  if (act.createdById !== session.id && actor.role !== "head") {
    throw new ServiceError(403, "Not allowed to update this activity.");
  }

  const patch: Prisma.ActivityUpdateInput = {};
  if (data.initiativeTeamwork?.trim()) {
    patch.initiativeTeamwork = data.initiativeTeamwork.trim();
  }
  if (data.challenges?.trim()) patch.challenges = data.challenges.trim();
  if (data.outcomes?.trim()) patch.outcomes = data.outcomes.trim();
  if (data.nextSteps?.trim()) patch.nextSteps = data.nextSteps.trim();

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: patch,
    include: activityInclude,
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_update",
    targetId: activityId,
    targetType: "activity",
  });

  return mapActivity(updated);
}

export async function addComment(
  session: SessionUser,
  activityId: string,
  text: string,
): Promise<Comment> {
  const actor = await requireActor(session);
  if (!canComment(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can comment.");
  }
  const act = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");

  const trimmed = text.trim();
  if (!trimmed) throw new ServiceError(400, "Comment text is required.");

  const comment = await prisma.comment.create({
    data: {
      activityId,
      authorId: session.id,
      text: trimmed,
    },
  });

  if (act.createdById !== session.id) {
    await pushNotification(
      act.createdById,
      "comment",
      `${firstName(mapUser(actor).name)} commented on "${act.title}".`,
      activityId,
    );
  }

  return mapComment(comment);
}

// ---------------------------------------------------------------------------
// RSVP (cryptographic tokens)
// ---------------------------------------------------------------------------

/**
 * Generate a new opaque RSVP token for a daily log.
 * Stores only the hash; returns the raw token once.
 */
export async function ensureRsvpToken(
  session: SessionUser,
  logId: string,
): Promise<{ log: DailyLog; token: string }> {
  const actor = await requireActor(session);
  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    include: { ...logInclude, activity: true },
  });
  if (!log) throw new ServiceError(404, "Log not found.");
  if (log.activity.softDeletedAt) {
    throw new ServiceError(404, "Activity not found.");
  }
  if (
    log.activity.createdById !== session.id &&
    actor.role !== "head"
  ) {
    throw new ServiceError(403, "Not allowed.");
  }

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);

  const updated = await prisma.dailyLog.update({
    where: { id: logId },
    data: { rsvpTokenHash: tokenHash },
    include: logInclude,
  });

  return { log: mapDailyLog(updated), token: rawToken };
}

/** @deprecated Use ensureRsvpToken — client-supplied tokens are ignored. */
export async function setLogRsvpToken(
  session: SessionUser,
  logId: string,
  // retained for call-site compatibility; value is intentionally ignored
  token?: string,
): Promise<{ log: DailyLog; token: string }> {
  void token;
  return ensureRsvpToken(session, logId);
}

/** Public RSVP — requires cryptographic token matching rsvpTokenHash. */
export async function addRsvpAttendee(
  token: string,
  attendee: Omit<Attendee, "source" | "at"> & { source?: Attendee["source"] },
  logIdHint?: string,
): Promise<{ ok: true }> {
  const raw = (token || "").trim();
  if (!raw || raw.length < 16) {
    throw new ServiceError(400, "Valid RSVP token is required.");
  }

  const tokenHash = hashToken(raw);
  const log = await prisma.dailyLog.findUnique({
    where: { rsvpTokenHash: tokenHash },
  });
  if (!log) {
    throw new ServiceError(404, "Attendance list not found or link expired.");
  }
  if (logIdHint && log.id !== logIdHint) {
    throw new ServiceError(403, "Token does not match this attendance list.");
  }

  const name = (attendee.name || "").trim();
  if (!name) throw new ServiceError(400, "Name is required.");

  await prisma.attendee.create({
    data: {
      dailyLogId: log.id,
      name,
      phone: (attendee.phone || "").trim(),
      email: (attendee.email || "").trim(),
      source: attendee.source || "link",
      registeredAt: new Date(),
    },
  });

  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export async function listDmsForUser(
  session: SessionUser,
  opts?: { page?: number; limit?: number; withUserId?: string },
): Promise<{ dms: ReturnType<typeof mapDm>[]; total: number }> {
  await requireActor(session);
  const page = opts?.page ?? 1;
  const limit = Math.min(opts?.limit ?? 100, 200);
  const skip = (page - 1) * limit;

  const where: Prisma.DirectMessageWhereInput = {
    OR: [{ participantA: session.id }, { participantB: session.id }],
  };
  if (opts?.withUserId) {
    const [a, b] = canonicalPair(session.id, opts.withUserId);
    where.participantA = a;
    where.participantB = b;
    delete where.OR;
  }

  const [rows, total] = await Promise.all([
    prisma.directMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        attachments: true,
        deletedBy: { where: { userId: session.id }, select: { id: true } }
      }
    }),
    prisma.directMessage.count({ where }),
  ]);

  return { 
    dms: rows.map(r => mapDm(r, r.deletedBy?.length ? new Set([r.id]) : undefined)), 
    total 
  };
}

export async function sendDm(
  session: SessionUser,
  toId: string,
  text: string,
  attachments?: any[]
): Promise<{ id: string }> {
  const actor = await requireActor(session);
  if (toId === session.id) {
    throw new ServiceError(400, "Cannot message yourself.");
  }
  const recipient = await prisma.user.findUnique({ where: { id: toId } });
  if (!recipient || !recipient.isActive) {
    throw new ServiceError(404, "Recipient not found.");
  }
  const trimmed = text.trim();
  if (!trimmed && (!attachments || attachments.length === 0)) {
    throw new ServiceError(400, "Message text or attachment is required.");
  }

  const [a, b] = canonicalPair(session.id, toId);
  const msg = await prisma.directMessage.create({
    data: {
      participantA: a,
      participantB: b,
      fromUserId: session.id,
      text: trimmed,
      ...(attachments && attachments.length > 0 && {
        attachments: {
          create: attachments.map((att: any) => ({
            name: att.name,
            size: att.size,
            contentType: att.contentType,
            storageKey: att.storageKey,
            width: att.width,
            height: att.height
          }))
        }
      })
    },
  });

  await pushNotification(
    toId,
    "dm",
    `${firstName(mapUser(actor).name)} sent you a message.`,
    null,
    msg.id,
  );

  return { id: msg.id };
}

export async function listCommunity(
  opts?: { page?: number; limit?: number; userId?: string },
): Promise<{ community: ReturnType<typeof mapCommunity>[]; total: number }> {
  const page = opts?.page ?? 1;
  const limit = Math.min(opts?.limit ?? 100, 200);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.communityMessage.findMany({
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        attachments: true,
        ...(opts?.userId ? { deletedBy: { where: { userId: opts.userId }, select: { id: true } } } : {})
      }
    }),
    prisma.communityMessage.count(),
  ]);

  return { 
    community: rows.map(r => mapCommunity(r, (r as any).deletedBy?.length ? new Set([r.id]) : undefined)), 
    total 
  };
}

export async function sendCommunity(
  session: SessionUser,
  text: string,
  replyToId?: string | null,
  attachments?: any[],
  mentions?: { userId: string; position: number }[]
): Promise<{ id: string }> {
  await requireActor(session);
  const trimmed = text.trim();
  if (!trimmed && (!attachments || attachments.length === 0)) {
    throw new ServiceError(400, "Message text or attachment is required.");
  }

  // Parse @mentions: @username
  const mentionMatches = trimmed.match(/@([A-Za-z0-9_]+)/g) || [];
  const mentionedUsernames = [
    ...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())),
  ];

  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.communityMessage.create({
      data: {
        fromUserId: session.id,
        text: trimmed,
        replyToId: replyToId || null,
        ...(attachments && attachments.length > 0 && {
          attachments: {
            create: attachments.map((att: any) => ({
              name: att.name,
              size: att.size,
              contentType: att.contentType,
              storageKey: att.storageKey,
              width: att.width,
              height: att.height
            }))
          }
        })
      },
    });

    if (mentionedUsernames.length) {
      const users = await tx.user.findMany({
        where: {
          usernameNormalized: { in: mentionedUsernames },
          isActive: true,
        },
        select: { id: true },
      });
      if (users.length) {
        await tx.communityMessageMention.createMany({
          data: users.map((u) => ({
            messageId: created.id,
            userId: u.id,
          })),
          skipDuplicates: true,
        });
        for (const u of users) {
          if (u.id !== session.id) {
            await tx.notification.create({
              data: {
                userId: u.id,
                type: "mention",
                text: `You were mentioned in community chat.`,
                messageId: created.id,
              },
            });
          }
        }
      }
    }

    return created;
  });

  return { id: msg.id };
}

export async function wipeCommunity(session: SessionUser): Promise<void> {
  const actor = await requireActor(session);
  if (!canWipeCommunity(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can wipe community chat.");
  }
  await prisma.communityMessage.deleteMany();
}

export async function listBroadcasts(
  opts?: { page?: number; limit?: number },
): Promise<{ broadcasts: ReturnType<typeof mapBroadcast>[]; total: number }> {
  const page = opts?.page ?? 1;
  const limit = Math.min(opts?.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.broadcast.count(),
  ]);

  return { broadcasts: rows.map(mapBroadcast), total };
}

export async function sendBroadcast(
  session: SessionUser,
  text: string,
): Promise<{ id: string }> {
  const actor = await requireActor(session);
  if (!canBroadcast(mapUser(actor))) {
    throw new ServiceError(403, "Not allowed to broadcast.");
  }
  const trimmed = text.trim();
  if (!trimmed) throw new ServiceError(400, "Broadcast text is required.");

  const msg = await prisma.broadcast.create({
    data: { fromUserId: session.id, text: trimmed },
  });

  const others = await prisma.user.findMany({
    where: { isActive: true, id: { not: session.id } },
    select: { id: true },
  });
  if (others.length) {
    const textPreview = `Broadcast from ${mapUser(actor).name}: ${trimmed}`;
    await prisma.notification.createMany({
      data: others.map((u) => ({
        userId: u.id,
        type: "broadcast" as const,
        text: textPreview,
      })),
    });

    for (const u of others) {
      sendPushNotification(u.id, "📢 Unit Announcement", textPreview, { url: "/messages" }).catch(console.error);
    }
  }

  return { id: msg.id };
}

export async function listCallsForUser(
  session: SessionUser,
): Promise<ReturnType<typeof mapCall>[]> {
  await requireActor(session);
  const rows = await prisma.callRecord.findMany({
    where: {
      OR: [{ participantA: session.id }, { participantB: session.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(mapCall);
}

export async function recordCall(
  session: SessionUser,
  toId: string,
  durationSec: number,
): Promise<{ id: string }> {
  await requireActor(session);
  if (!await prisma.user.findUnique({ where: { id: toId } })) {
    throw new ServiceError(404, "Recipient not found.");
  }
  const [a, b] = canonicalPair(session.id, toId);
  const row = await prisma.callRecord.create({
    data: {
      participantA: a,
      participantB: b,
      fromUserId: session.id,
      durationSec: Math.max(0, Math.floor(durationSec || 0)),
    },
  });
  return { id: row.id };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function myNotifications(
  session: SessionUser,
  opts?: { page?: number; limit?: number },
): Promise<Notification[]> {
  const page = opts?.page ?? 1;
  const limit = Math.min(opts?.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const rows = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });
  return rows.map(mapNotification);
}

export async function markNotificationRead(
  session: SessionUser,
  id: string,
): Promise<void> {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw new ServiceError(404, "Notification not found.");
  if (n.userId !== session.id) {
    throw new ServiceError(403, "Not your notification.");
  }
  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  session: SessionUser,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: session.id, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Lightweight poll payload — unread counts + recent notifications only. */
export async function getPollSnapshot(session: SessionUser): Promise<{
  unreadNotifications: number;
  notifications: Notification[];
  serverTime: string;
}> {
  const [unread, recent] = await Promise.all([
    prisma.notification.count({
      where: { userId: session.id, readAt: null },
    }),
    prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    unreadNotifications: unread,
    notifications: recent.map(mapNotification),
    serverTime: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Responsibilities
// ---------------------------------------------------------------------------

export type ResponsibilityInput = {
  code: string;
  name: string;
  desc: string;
  deliverables: string[];
};

export async function listResponsibilities(): Promise<Responsibility[]> {
  const rows = await prisma.responsibility.findMany({
    orderBy: { code: "asc" },
  });
  return rows.map(mapResponsibility);
}

export async function createResponsibility(
  session: SessionUser,
  input: ResponsibilityInput,
): Promise<Responsibility> {
  const actor = await requireActor(session);
  if (!canManageResponsibilities(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can manage responsibilities.");
  }
  const code = (input.code || "").trim().toUpperCase();
  const name = (input.name || "").trim();
  const desc = (input.desc || "").trim();
  if (!code || !name || !desc) {
    throw new ServiceError(
      400,
      "Short code, name, and description are all required.",
    );
  }
  if (await prisma.responsibility.findUnique({ where: { code } })) {
    throw new ServiceError(
      409,
      "A responsibility with that short code already exists.",
    );
  }

  const row = await prisma.responsibility.create({
    data: {
      code,
      name,
      description: desc,
      deliverables: input.deliverables.map((d) => d.trim()).filter(Boolean),
      createdById: session.id,
    },
  });
  return mapResponsibility(row);
}

export async function updateResponsibility(
  session: SessionUser,
  id: string,
  input: ResponsibilityInput,
): Promise<Responsibility> {
  const actor = await requireActor(session);
  if (!canManageResponsibilities(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can manage responsibilities.");
  }
  const existing = await prisma.responsibility.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Responsibility not found.");

  const code = (input.code || "").trim().toUpperCase();
  const name = (input.name || "").trim();
  const desc = (input.desc || "").trim();
  if (!code || !name || !desc) {
    throw new ServiceError(
      400,
      "Short code, name, and description are all required.",
    );
  }

  const clash = await prisma.responsibility.findFirst({
    where: { code, id: { not: id } },
  });
  if (clash) {
    throw new ServiceError(
      409,
      "A responsibility with that short code already exists.",
    );
  }

  const deliverables = input.deliverables.map((d) => d.trim()).filter(Boolean);
  const row = await prisma.responsibility.update({
    where: { id },
    data: {
      code,
      name,
      description: desc,
      ...(deliverables.length ? { deliverables } : {}),
    },
  });
  return mapResponsibility(row);
}

export async function deactivateResponsibility(
  session: SessionUser,
  id: string,
): Promise<Responsibility> {
  const actor = await requireActor(session);
  if (!canManageResponsibilities(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can manage responsibilities.");
  }
  const existing = await prisma.responsibility.findUnique({ where: { id } });
  if (!existing) throw new ServiceError(404, "Responsibility not found.");

  const row = await prisma.responsibility.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  return mapResponsibility(row);
}

// ---------------------------------------------------------------------------
// Activity hide / soft-delete
// ---------------------------------------------------------------------------

export async function toggleActivityHidden(
  session: SessionUser,
  activityId: string,
): Promise<Activity> {
  const actor = await requireActor(session);
  if (!canDelegate(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can hide/unhide activities.");
  }
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
    include: activityInclude,
  });
  if (!act || act.softDeletedAt) throw new ServiceError(404, "Activity not found.");

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { hidden: !act.hidden },
    include: activityInclude,
  });
  return mapActivity(updated);
}

export async function softDeleteActivity(
  session: SessionUser,
  activityId: string,
): Promise<Activity> {
  const actor = await requireActor(session);
  if (!canDelegate(mapUser(actor))) {
    throw new ServiceError(403, "Only the Unit Head can delete activities.");
  }
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
    include: activityInclude,
  });
  if (!act) throw new ServiceError(404, "Activity not found.");

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { softDeletedAt: new Date() },
    include: activityInclude,
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_delete",
    targetId: activityId,
    targetType: "activity",
  });

  return mapActivity(updated);
}

// ---------------------------------------------------------------------------
// Status recompute + scoped bootstrap
// ---------------------------------------------------------------------------

export async function recomputeAllStatuses(): Promise<void> {
  const acts = await prisma.activity.findMany({
    where: { softDeletedAt: null },
    select: { id: true },
  });
  const n = now();
  for (const a of acts) {
    await recomputeActivityStatus(a.id, n);
  }
}

/**
 * Scoped bootstrap for the authenticated user.
 * Never returns other users' DMs, full notification sets, or hidden others' data.
 *
 * Status recompute runs on write paths (create/submit log) — do NOT recompute all
 * activities here or first paint hangs on slow DBs / large datasets.
 */
export async function getScopedBootstrap(session: SessionUser): Promise<{
  users: User[];
  activities: Activity[];
  dailyLogs: DailyLog[];
  comments: Comment[];
  dms: ReturnType<typeof mapDm>[];
  calls: ReturnType<typeof mapCall>[];
  community: ReturnType<typeof mapCommunity>[];
  broadcasts: ReturnType<typeof mapBroadcast>[];
  notifications: Notification[];
  responsibilities: Responsibility[];
  serverTime: string;
}> {
  await requireActor(session);

  const isHead = session.role === "head";

  const activityWhere: Prisma.ActivityWhereInput = {
    softDeletedAt: null,
    ...(isHead ? {} : { createdById: session.id, hidden: false }),
  };

  // Parallel reads only — actor already validated; avoid nested requireActor
  // round-trips that stack latency on remote Postgres.
  const [
    users,
    activities,
    responsibilities,
    dmRows,
    callRows,
    communityRows,
    broadcastRows,
    notifRows,
  ] = await Promise.all([
    listUsers(),
    prisma.activity.findMany({
      where: activityWhere,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    listResponsibilities(),
    prisma.directMessage.findMany({
      where: {
        OR: [{ participantA: session.id }, { participantB: session.id }],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        attachments: true,
        deletedBy: { where: { userId: session.id }, select: { id: true } }
      }
    }),
    prisma.callRecord.findMany({
      where: {
        OR: [{ participantA: session.id }, { participantB: session.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.communityMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        attachments: true,
        deletedBy: { where: { userId: session.id }, select: { id: true } }
      }
    }),
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const activityIds = activities.map((a) => a.id);
  const [dailyLogs, comments] = await Promise.all([
    activityIds.length
      ? prisma.dailyLog.findMany({
          where: { activityId: { in: activityIds } },
          include: logInclude,
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    activityIds.length
      ? prisma.comment.findMany({
          where: { activityId: { in: activityIds } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    users,
    activities: activities.map(mapActivity),
    dailyLogs: dailyLogs.map(mapDailyLog),
    comments: comments.map(mapComment),
    dms: dmRows.map(r => mapDm(r, (r as any).deletedBy?.length ? new Set([r.id]) : undefined)),
    calls: callRows.map(mapCall),
    community: communityRows.map(r => mapCommunity(r, (r as any).deletedBy?.length ? new Set([r.id]) : undefined)),
    broadcasts: broadcastRows.map(mapBroadcast),
    notifications: notifRows.map(mapNotification),
    responsibilities,
    serverTime: new Date().toISOString(),
  };
}

export async function deleteCommunityMessage(session: SessionUser, id: string, forEveryone: boolean) {
  const actor = await requireActor(session);
  const msg = await prisma.communityMessage.findUnique({ where: { id } });
  if (!msg) throw new ServiceError(404, "Message not found.");

  if (forEveryone) {
    if (msg.fromUserId !== session.id && actor.role !== "head") {
      throw new ServiceError(403, "Not allowed to delete this message for everyone.");
    }
    await prisma.communityMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } else {
    await prisma.deletedMessage.upsert({
      where: { userId_communityMessageId: { userId: session.id, communityMessageId: id } },
      update: {},
      create: { userId: session.id, communityMessageId: id },
    });
  }
  return true;
}

export async function deleteDmMessage(session: SessionUser, id: string, forEveryone: boolean) {
  const msg = await prisma.directMessage.findUnique({ where: { id } });
  if (!msg) throw new ServiceError(404, "Message not found.");
  
  if (msg.participantA !== session.id && msg.participantB !== session.id) {
    throw new ServiceError(403, "Not a participant in this conversation.");
  }

  if (forEveryone) {
    if (msg.fromUserId !== session.id) {
      throw new ServiceError(403, "Only the sender can delete a message for everyone.");
    }
    await prisma.directMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } else {
    await prisma.deletedMessage.upsert({
      where: { userId_directMessageId: { userId: session.id, directMessageId: id } },
      update: {},
      create: { userId: session.id, directMessageId: id },
    });
  }
  return true;
}
