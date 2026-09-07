with open("src/lib/db/service.ts", "r") as f:
    content = f.read()

old_code = """export async function toggleActivityHidden(
  session: SessionUser,
  activityId: string,
): Promise<ActivityPayload> {
  await requireRole(session, "head");
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { hidden: !act.hidden },
    include: activityInclude,
  });

  return mapActivity(updated);
}

export async function getScopedBootstrap(session: SessionUser): Promise<{"""

new_code = """export async function toggleActivityHidden(
  session: SessionUser,
  activityId: string,
): Promise<ActivityPayload> {
  await requireRole(session, "head");
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { hidden: !act.hidden },
    include: activityInclude,
  });

  return mapActivity(updated);
}

export async function hardDeleteActivity(
  session: SessionUser,
  activityId: string,
): Promise<void> {
  const actor = await requireActor(session);
  // Only the Unit Head can delete activities (Members are denied)
  if (actor.role !== "head") {
    throw new ServiceError(403, "Only the Unit Head can delete activities.");
  }
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");
  if (act.status !== "missed") {
    throw new ServiceError(400, "Only missed activities can be deleted.");
  }

  // Delete associated notifications manually since they don't have a strict FK
  await prisma.notification.deleteMany({
    where: { activityId },
  });

  // Delete the activity (this will cascade to DailyLog, Comment, ActivityResponsibility, etc.)
  await prisma.activity.delete({
    where: { id: activityId },
  });

  await recordAuditEvent({
    userId: session.authUserId,
    action: "activity_delete",
    targetId: activityId,
    targetType: "activity",
    meta: {
      title: act.title,
    },
  });
}

export async function softDeleteActivity(
  session: SessionUser,
  activityId: string,
): Promise<ActivityPayload> {
  await requireRole(session, "head");
  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { 
      softDeletedAt: new Date(),
      reminderStatus: { cancelled: true },
    },
    include: activityInclude,
  });

  return mapActivity(updated);
}

export async function getScopedBootstrap(session: SessionUser): Promise<{"""

content = content.replace(old_code, new_code)
with open("src/lib/db/service.ts", "w") as f:
    f.write(content)
