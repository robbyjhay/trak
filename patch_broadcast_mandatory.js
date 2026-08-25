const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const prefs = await prisma\.userPreferences\.findUnique\(\{ where: \{ userId \} \}\);\s*if \(prefs\) \{\s*if \(\!prefs\.notificationsEnabled\) return;\s*if \(type === 'dm' && \!prefs\.dmNotifications\) return;\s*if \(type === 'broadcast' && \!prefs\.broadcastNotifications\) return;\s*if \(\['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'\]\.includes\(type\) && \!prefs\.activityNotifications\) return;\s*\}/,
  `const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  if (prefs && type !== 'broadcast') {
    if (!prefs.notificationsEnabled) return;
    if (type === 'dm' && !prefs.dmNotifications) return;
    if (['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'].includes(type) && !prefs.activityNotifications) return;
  }`
);

code = code.replace(
  /const validOthers = others\.filter\(u => \{\s*const p = prefsMap\.get\(u\.id\);\s*if \(\!p\) return true; \/\/ default true\s*if \(\!p\.notificationsEnabled\) return false;\s*if \(\!p\.broadcastNotifications\) return false;\s*return true;\s*\}\);\s*if \(validOthers\.length > 0\) \{\s*await prisma\.notification\.createMany\(\{\s*data: validOthers\.map\(\(u\) => \(\{\s*userId: u\.id,\s*type: "broadcast" as const,\s*text: \`Broadcast from \$\{mapUser\(actor\)\.name\}: \$\{trimmed\}\`,\s*\}\)\),\s*\}\);\s*\}/,
  `if (others.length > 0) {
      await prisma.notification.createMany({
        data: others.map((u) => ({
          userId: u.id,
          type: "broadcast" as const,
          text: \`Broadcast from \$\{mapUser(actor).name\}: \$\{trimmed\}\`,
        })),
      });
    }`
);

// wait, the previous code also had "const othersPrefs = await prisma.userPreferences.findMany...". Let me just re-rewrite that entire block.
