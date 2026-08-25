const fs = require('fs');
const file = 'src/lib/db/service.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace in pushNotification
code = code.replace(
  /const prefs = await prisma\.userPreferences\.findUnique\(\{ where: \{ userId \} \}\);\s*if \(prefs\) \{\s*if \(\!prefs\.notificationsEnabled\) return;\s*if \(type === 'dm' && \!prefs\.dmNotifications\) return;\s*if \(type === 'broadcast' && \!prefs\.broadcastNotifications\) return;\s*if \(\['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'\]\.includes\(type\) && \!prefs\.activityNotifications\) return;\s*\}/,
  `const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  if (prefs && type !== 'broadcast') {
    if (!prefs.notificationsEnabled) return;
    if (type === 'dm' && !prefs.dmNotifications) return;
    if (['activity_created', 'activity_completed', 'activity_missed', 'comment', 'mention'].includes(type) && !prefs.activityNotifications) return;
  }`
);

// Replace in createBroadcast
const searchStr = `const othersPrefs = await prisma.userPreferences.findMany({`;
const endStr = `});\n    }`;

let startIndex = code.indexOf(searchStr);
if (startIndex !== -1) {
  let temp = code.substring(startIndex);
  let endIndex = temp.indexOf('text: `Broadcast from ${mapUser(actor).name}: ${trimmed}`,') + 100;
  endIndex = temp.indexOf('    }', endIndex) + 5;
  
  const replacement = `if (others.length > 0) {
      await prisma.notification.createMany({
        data: others.map((u) => ({
          userId: u.id,
          type: "broadcast" as const,
          text: \`Broadcast from \$\{mapUser(actor).name\}: \$\{trimmed\}\`,
        })),
      });
    }`;
  code = code.substring(0, startIndex) + replacement + temp.substring(endIndex);
}

fs.writeFileSync(file, code);
