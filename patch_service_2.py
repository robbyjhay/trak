with open('src/lib/db/service.ts', 'r') as f:
    content = f.read()

bad_block = """  // Cancel reminders when activity is completed
  if (updatedAct.status === "completed") {
    await prisma.activity.update({
      where: { id: activityId },
      data: { reminderStatus: { cancelled: true } },
    });
  }

  const updatedAct = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: activityInclude,
  });"""

good_block = """  const updatedAct = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: activityInclude,
  });

  // Cancel reminders when activity is completed
  if (updatedAct.status === "completed") {
    await prisma.activity.update({
      where: { id: activityId },
      data: { reminderStatus: { cancelled: true } },
    });
  }"""

content = content.replace(bad_block, good_block)

with open('src/lib/db/service.ts', 'w') as f:
    f.write(content)
