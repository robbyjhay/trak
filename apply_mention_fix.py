import re

with open("src/lib/db/mappers.ts", "r") as f:
    mappers = f.read()
mappers = mappers.replace('position: 0,', 'position: m.position,')
with open("src/lib/db/mappers.ts", "w") as f:
    f.write(mappers)

with open("src/lib/db/service.ts", "r") as f:
    service = f.read()

old_sig = '''export async function sendCommunity(
  session: SessionUser,
  text: string,
  replyToId?: string | null,
  attachments?: any[]
): Promise<{ id: string }> {'''

new_sig = '''export async function sendCommunity(
  session: SessionUser,
  text: string,
  replyToId?: string | null,
  attachments?: any[],
  mentions?: { userId: string; position: number }[]
): Promise<{ id: string }> {'''

service = service.replace(old_sig, new_sig)

old_logic = '''  // Parse @mentions: @username
  const mentionMatches = trimmed.match(/@([A-Za-z0-9_]+)/g) || [];
  const mentionedUsernames = [
    ...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())),
  ];

  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.communityMessage.create({
      data: {
        fromUserId: session.id,
        text: trimmed,
        replyToId: replyToId || null,
        ...(attachments && attachments.length > 0 && {
          attachments: {
            create: attachments.map((att: any) => ({
              name: att.name,
              size: att.size,
              contentType: att.contentType,
              storageKey: att.storageKey,
              width: att.width,
              height: att.height
            }))
          }
        })
      },
    });

    if (mentionedUsernames.length) {
      const users = await tx.user.findMany({
        where: {
          usernameNormalized: { in: mentionedUsernames },
          isActive: true,
        },
        select: { id: true },
      });
      if (users.length) {
        await tx.communityMessageMention.createMany({
          data: users.map((u) => ({
            messageId: created.id,
            userId: u.id,
          })),
          skipDuplicates: true,
        });
        for (const u of users) {
          await createNotification(tx, {
            type: "MENTION",
            userId: u.id,
            actorId: session.id,
            text: `mentioned you in the community chat`,
            link: `#thread`,
          });
        }
      }
    }'''

new_logic = '''  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.communityMessage.create({
      data: {
        fromUserId: session.id,
        text: trimmed,
        replyToId: replyToId || null,
        ...(attachments && attachments.length > 0 && {
          attachments: {
            create: attachments.map((att: any) => ({
              name: att.name,
              size: att.size,
              contentType: att.contentType,
              storageKey: att.storageKey,
              width: att.width,
              height: att.height
            }))
          }
        })
      },
    });

    if (mentions && mentions.length > 0) {
      await tx.communityMessageMention.createMany({
        data: mentions.map((m) => ({
          messageId: created.id,
          userId: m.userId,
          position: m.position,
        })),
        skipDuplicates: true,
      });
      
      const uniqueUserIds = [...new Set(mentions.map(m => m.userId))];
      for (const uid of uniqueUserIds) {
        await createNotification(tx, {
          type: "MENTION",
          userId: uid,
          actorId: session.id,
          text: `mentioned you in the community chat`,
          link: `#thread`,
        });
      }
    } else {
      // Fallback: Parse @mentions: @username
      const mentionMatches = trimmed.match(/@([A-Za-z0-9_]+)/g) || [];
      const mentionedUsernames = [
        ...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())),
      ];
      if (mentionedUsernames.length) {
        const users = await tx.user.findMany({
          where: {
            usernameNormalized: { in: mentionedUsernames },
            isActive: true,
          },
          select: { id: true },
        });
        if (users.length) {
          await tx.communityMessageMention.createMany({
            data: users.map((u) => ({
              messageId: created.id,
              userId: u.id,
              position: 0,
            })),
            skipDuplicates: true,
          });
          for (const u of users) {
            await createNotification(tx, {
              type: "MENTION",
              userId: u.id,
              actorId: session.id,
              text: `mentioned you in the community chat`,
              link: `#thread`,
            });
          }
        }
      }
    }'''

service = service.replace(old_logic, new_logic)
with open("src/lib/db/service.ts", "w") as f:
    f.write(service)


with open("src/context/TrakStore.tsx", "r") as f:
    store = f.read()

store_old_sig = '''  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[], mentions?: { userId: string; position: number }[]) => Promise<void>;'''
store_new_sig = '''  sendCommunity: (text: string, attachments?: SendMessageAttachmentInput[], mentions?: { userId: string; position: number }[]) => Promise<void>;'''

store_old_impl = '''    sendCommunity: async (text, attachments, mentions) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.community.push({
        id: tempId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: null,
      });'''

store_new_impl = '''    sendCommunity: async (text, attachments, mentions) => {
      const tempId = `temp_${Date.now()}`;
      stateRef.current.db.community.push({
        id: tempId,
        from: session.id,
        text,
        attachments: (attachments || []).map((a, i) => ({ ...a, id: `${tempId}_${i}`, messageId: tempId })),
        at: new Date().toISOString(),
        replyToId: null,
        mentions: (mentions || []).map(m => ({
          userId: m.userId,
          position: m.position,
          displayName: userMap[m.userId]?.name || "Unknown",
        })),
      });'''

store = store.replace(store_old_impl, store_new_impl)
with open("src/context/TrakStore.tsx", "w") as f:
    f.write(store)

