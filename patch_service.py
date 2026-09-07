with open('src/lib/db/service.ts', 'r') as f:
    content = f.read()

import_str = 'import { sendToUser } from "@/lib/realtime";'
if import_str not in content:
    content = content.replace(
        'import { generateStarterPassword, hashPassword } from "@/lib/auth/password";',
        'import { generateStarterPassword, hashPassword } from "@/lib/auth/password";\nimport { broadcast } from "@/lib/realtime";'
    )

old_end = """
  const u = mapUser(updated);
  u.photoUrl = publicStorageUrl(u.photoUrl);
  return u;
}"""

new_end = """
  const u = mapUser(updated);
  u.photoUrl = publicStorageUrl(u.photoUrl);
  
  // Realtime Profile Sync
  // Broadcast the canonical database record to all authenticated users via WebSocket.
  // This enables the Head Dashboard to immediately reflect profile edits without polling.
  broadcast({ type: "profile_updated", user: u });

  return u;
}"""

content = content.replace(old_end, new_end)

with open('src/lib/db/service.ts', 'w') as f:
    f.write(content)
