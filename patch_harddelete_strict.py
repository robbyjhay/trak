import re

with open('src/lib/db/service.ts', 'r') as f:
    content = f.read()

old_delete = """  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");

  // Delete associated notifications manually since they don't have a strict FK"""

new_delete = """  const act = await prisma.activity.findUnique({
    where: { id: activityId },
  });
  if (!act) throw new ServiceError(404, "Activity not found.");
  if (act.status !== "missed") {
    throw new ServiceError(400, "Only missed activities can be deleted.");
  }

  // Delete associated notifications manually since they don't have a strict FK"""

content = content.replace(old_delete, new_delete)

with open('src/lib/db/service.ts', 'w') as f:
    f.write(content)
