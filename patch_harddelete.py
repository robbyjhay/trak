import re

with open('src/lib/db/service.ts', 'r') as f:
    content = f.read()

new_func = """export async function hardDeleteActivity(
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
"""

# add it after softDeleteActivity
content = content.replace("export async function softDeleteActivity(", new_func + "\nexport async function softDeleteActivity(")

with open('src/lib/db/service.ts', 'w') as f:
    f.write(content)
