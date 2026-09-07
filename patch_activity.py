with open("src/context/TrakStore.tsx", "r") as f:
    ts = f.read()
if "deleteActivity: async" not in ts:
    ts = ts.replace("deactivateResponsibility: async", """deleteActivity: async (activityId) => {
      await apiSend(`/api/activities/${activityId}`, "PATCH", {
        action: "softDelete",
      });
      const act = stateRef.current.db.activities.find((a) => a.id === activityId);
      if (act) act.softDeletedAt = new Date().toISOString();
      bump();
    },
    deactivateResponsibility: async""")
    with open("src/context/TrakStore.tsx", "w") as f:
        f.write(ts)

with open("src/lib/db/service.ts", "r") as f:
    sv = f.read()
if "hardDeleteActivity" not in sv:
    old_toggle = """  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { hidden: !act.hidden },
    include: activityInclude,
  });

  return mapActivity(updated);
}"""
    new_toggle = old_toggle + """

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
}"""
    sv = sv.replace(old_toggle, new_toggle)
    with open("src/lib/db/service.ts", "w") as f:
        f.write(sv)
