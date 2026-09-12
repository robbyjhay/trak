import "server-only";
import { prisma } from "@/lib/db/prisma";
import { ServiceError, createActivity } from "@/lib/db/service";
import { mapActivity } from "@/lib/db/mappers";
import { notifyUser } from "@/lib/notifications";
import { isHead } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/services/audit.service";
import type { Activity, SessionUser } from "@/lib/types";

const activityInclude = {
  responsibilities: true,
} as const;

interface Assignee {
  id: string;
}

async function requireActor(session: SessionUser) {
  if (!session?.id) throw new ServiceError(401, "Unauthorized");
}

async function requireHead(session: SessionUser) {
  await requireActor(session);
  if (!isHead(session)) {
    throw new ServiceError(403, "Only the Unit Head can delegate work.");
  }
}

async function requireAssignee(
  session: SessionUser,
  assigneeId: string,
): Promise<Assignee> {
  const member = await prisma.user.findUnique({
    where: { id: assigneeId },
  });
  if (!member || !member.isActive) {
    throw new ServiceError(400, "Select a valid member.");
  }
  if (member.role === "head") {
    throw new ServiceError(400, "Cannot delegate work to the Unit Head.");
  }
  return { id: member.id };
}

async function notifyAssignee(
  assigneeId: string,
  activityId: string,
  text: string,
  meta: { libraryResourceId?: string; innovationId?: string },
) {
  await notifyUser({
    userId: assigneeId,
    type: "work_delegated",
    text,
    activityId,
    meta: { ...meta, url: `/activity/${activityId}` },
    dedupeKey: `work-delegated:${activityId}:${assigneeId}`,
  });
}

function delegationTaskDates(dueAt?: string | null): {
  startDate: string;
  startTime: string;
  defaultDueAt: string;
} {
  const today = new Date();
  const isoDay = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const day = dueAt?.trim() || isoDay(today);
  return { startDate: day, startTime: "09:00", defaultDueAt: `${day}T23:59:59` };
}

// ---------------------------------------------------------------------------
// UNIT_WORK: assign an existing pending activity to a member
// ---------------------------------------------------------------------------

export async function delegateUnitWork(
  session: SessionUser,
  input: { activityId: string; assigneeId: string },
): Promise<Activity> {
  await requireHead(session);

  const act = await prisma.activity.findUnique({
    where: { id: input.activityId },
  });
  if (!act || act.softDeletedAt) {
    throw new ServiceError(404, "Activity not found.");
  }
  if (act.type === "Task" && act.delegationType === "SELF_DEVELOPMENT") {
    throw new ServiceError(400, "Self-development tasks cannot be re-delegated.");
  }
  if (act.status !== "pending") {
    throw new ServiceError(400, "Only pending activities can be delegated.");
  }
  if (act.assigneeId) {
    throw new ServiceError(400, "This activity is already assigned to a member.");
  }

  const assignee = await requireAssignee(session, input.assigneeId);

  const updated = await prisma.activity.update({
    where: { id: input.activityId },
    data: {
      assigneeId: assignee.id,
      delegatedById: session.id,
      delegationType: "UNIT_WORK",
    },
    include: activityInclude,
  });

  await notifyAssignee(
    assignee.id,
    updated.id,
    `${firstName(session.name)} delegated a task to you: "${updated.title}".`,
    {},
  );

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_update",
    targetId: updated.id,
    targetType: "activity",
    meta: { delegationType: "UNIT_WORK", assigneeId: assignee.id },
  });

  const refreshed = await prisma.activity.findUniqueOrThrow({
    where: { id: updated.id },
    include: activityInclude,
  });
  return mapActivity(refreshed);
}

// ---------------------------------------------------------------------------
// SELF_DEVELOPMENT: delegate an approved Library resource to a member
// ---------------------------------------------------------------------------

export async function delegateSelfDevelopment(
  session: SessionUser,
  input: {
    libraryResourceId: string;
    assigneeId: string;
    dueAt?: string | null;
    notes?: string;
  },
): Promise<Activity> {
  await requireHead(session);

  const resource = await prisma.libraryResource.findUnique({
    where: { id: input.libraryResourceId },
  });
  if (!resource) throw new ServiceError(404, "Resource not found.");
  if (resource.status !== "APPROVED") {
    throw new ServiceError(400, "Only approved resources can be delegated for self-development.");
  }

  const assignee = await requireAssignee(session, input.assigneeId);

  const existing = await prisma.activity.findFirst({
    where: {
      assigneeId: assignee.id,
      delegationType: "SELF_DEVELOPMENT",
      libraryResourceId: resource.id,
      softDeletedAt: null,
    },
  });
  if (existing) {
    throw new ServiceError(
      400,
      "This resource is already delegated to that member for self-development.",
    );
  }

  const dates = delegationTaskDates(input.dueAt);
  const notes = input.notes?.trim();

  const activity = await createActivity(session, {
    title: `Self-development: ${resource.title}`,
    type: "Task",
    description: notes || resource.description || "",
    delegatedBy: session.id,
    assigneeId: assignee.id,
    delegationType: "SELF_DEVELOPMENT",
    libraryResourceId: resource.id,
    startDate: dates.startDate,
    endDate: dates.startDate,
    startTime: dates.startTime,
    responsibilityIds: [],
    defaultDueAt: dates.defaultDueAt,
  });

  return activity;
}

// ---------------------------------------------------------------------------
// INNOVATION: assign a member to collaborate on an innovation idea
// ---------------------------------------------------------------------------

export async function delegateInnovation(
  session: SessionUser,
  input: {
    innovationId: string;
    assigneeId: string;
    dueAt?: string | null;
    notes?: string;
  },
): Promise<Activity> {
  await requireHead(session);

  const innovation = await prisma.innovation.findUnique({
    where: { id: input.innovationId },
  });
  if (!innovation) throw new ServiceError(404, "Innovation not found.");

  const assignee = await requireAssignee(session, input.assigneeId);

  if (innovation.submittedById === assignee.id) {
    throw new ServiceError(
      400,
      "Cannot assign the idea author as their own collaborator.",
    );
  }

  const existing = await prisma.activity.findFirst({
    where: {
      assigneeId: assignee.id,
      delegationType: "INNOVATION",
      innovationId: innovation.id,
      softDeletedAt: null,
    },
  });
  if (existing) {
    throw new ServiceError(
      400,
      "This member is already assigned to collaborate on this idea.",
    );
  }

  const dates = delegationTaskDates(input.dueAt);
  const notes = input.notes?.trim();

  const activity = await createActivity(session, {
    title: `Collaborate on idea: ${innovation.title}`,
    type: "Task",
    description: notes || innovation.description || "",
    delegatedBy: session.id,
    assigneeId: assignee.id,
    delegationType: "INNOVATION",
    innovationId: innovation.id,
    startDate: dates.startDate,
    endDate: dates.startDate,
    startTime: dates.startTime,
    responsibilityIds: [],
    defaultDueAt: dates.defaultDueAt,
  });

  return activity;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}