const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

// Find pushNotification function
code = code.replace(
  /async function pushNotification\(\s*userId: string,\s*type: Notification\["type"\],\s*text: string,\s*activityId\?: string \| null,\s*messageId\?: string \| null,\s*\): Promise<void> \{/,
  `async function pushNotification(
  userId: string,
  type: Notification["type"],
  text: string,
  activityId?: string | null,
  messageId?: string | null,
): Promise<void> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  if (prefs) {
    if (!prefs.notificationsEnabled) return;
    if (type === 'dm' && !prefs.dmNotifications) return;
    if (type === 'broadcast' && !prefs.broadcastNotifications) return;
    if (['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'].includes(type) && !prefs.activityNotifications) return;
  }`
);

// We need to also patch the createMany used in createBroadcast
code = code.replace(
  /await prisma.notification.createMany\(\{\s*data: others.map\(\(u\) => \(\{\s*userId: u.id,\s*type: "broadcast" as const,\s*text: \`Broadcast from \$\{mapUser\(actor\).name\}: \$\{trimmed\}\`,\s*\}\)\),\s*\}\);/g,
  `
    const othersPrefs = await prisma.userPreferences.findMany({
      where: { userId: { in: others.map(u => u.id) } }
    });
    const prefsMap = new Map(othersPrefs.map(p => [p.userId, p]));
    
    const validOthers = others.filter(u => {
      const p = prefsMap.get(u.id);
      if (!p) return true; // default true
      if (!p.notificationsEnabled) return false;
      if (!p.broadcastNotifications) return false;
      return true;
    });

    if (validOthers.length > 0) {
      await prisma.notification.createMany({
        data: validOthers.map((u) => ({
          userId: u.id,
          type: "broadcast" as const,
          text: \`Broadcast from \$\{mapUser(actor).name\}: \$\{trimmed\}\`,
        })),
      });
    }
  `
);

fs.writeFileSync(file, code);
