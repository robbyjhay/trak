const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

// pushNotification
code = code.replace(
  /async function pushNotification\([\s\S]*?Promise<void> \{/,
  `async function pushNotification(
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
  }`
);

// createBroadcast
code = code.replace(
  /await prisma\.notification\.createMany\(\{[\s\S]*?data: others\.map\(\(u\) => \(\{\s*userId: u\.id,\s*type: "broadcast" as const,\s*text: \`Broadcast from \$\{mapUser\(actor\)\.name\}: \$\{trimmed\}\`,\s*\}\)\),[\s\S]*?\}\);\s*\}/,
  `await prisma.notification.createMany({
        data: others.map((u) => ({
          userId: u.id,
          type: "broadcast" as const,
          text: \`Broadcast from \$\{mapUser(actor).name\}: \$\{trimmed\}\`,
        })),
      });
    }`
);

fs.writeFileSync(file, code);
