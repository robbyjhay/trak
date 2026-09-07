with open('src/lib/constants.ts', 'r') as f:
    content = f.read()

good = """export const NOTIF_PATHS: Record<NotifType, string> = {
  comment:
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  dm: "M22 2L11 13 M22 2l-7 20-4-9-9-4z",
  community: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  activity_created: "M12 5v14M5 12h14",
  activity_completed: "M20 6L9 17l-5-5",
  activity_reminder: "M12 2v10l4.5 4.5 M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z",
  activity_missed:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v5 M12 16h.01",
  broadcast:
    "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  mention:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v.01 M8 10h4a2 2 0 0 1 0 4H9v3",
};"""

import re
content = re.sub(r'export const NOTIF_PATHS: Record<NotifType, string> = \{.*?\};', good, content, flags=re.DOTALL)

with open('src/lib/constants.ts', 'w') as f:
    f.write(content)
