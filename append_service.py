with open("src/lib/db/service.ts", "r") as f:
    sv = f.read()

new_funcs = """

export async function hardDeleteActivity(
  session: SessionUser,
  activityId: string,
): Promise<void> {
  const actor = await requireActor(session);
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

  await prisma.notification.deleteMany({
    where: { activityId },
  });

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

if "hardDeleteActivity" not in sv:
    sv += new_funcs
    with open("src/lib/db/service.ts", "w") as f:
        f.write(sv)
