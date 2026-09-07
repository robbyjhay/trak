import re

with open("src/lib/db/service.ts", "r") as f:
    text = f.read()

text = text.replace(
    'export async function sendDm(\n  session: SessionUser,\n  toId: string,\n  text: string,\n  attachments?: any[]\n): Promise<{ id: string }> {',
    'export async function sendDm(\n  session: SessionUser,\n  toId: string,\n  text: string,\n  attachments?: any[],\n  replyToId?: string | null\n): Promise<{ id: string }> {'
)

text = text.replace(
    '        fromUserId: session.id,\n        toUserId: toId,\n        text: trimmed,',
    '        fromUserId: session.id,\n        toUserId: toId,\n        text: trimmed,\n        replyToId: replyToId || null,'
)

with open("src/lib/db/service.ts", "w") as f:
    f.write(text)

