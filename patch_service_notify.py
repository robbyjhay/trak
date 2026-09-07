import re

with open('src/lib/db/service.ts', 'r') as f:
    content = f.read()

old_code = """    if (heads.length > 0) {
      await prisma.notification.createMany({
        data: heads.map(h => ({
          userId: h.id,
          type: "profile_updated",
          text,
          meta: { userId },
        }))
      });
    }"""

new_code = """    if (heads.length > 0) {
      await notifyMany(
        heads.map(h => ({
          userId: h.id,
          type: "profile_updated",
          text,
          meta: { userId },
        }))
      );
    }"""

content = content.replace(old_code, new_code)

with open('src/lib/db/service.ts', 'w') as f:
    f.write(content)
