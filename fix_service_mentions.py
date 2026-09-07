import re

with open("src/lib/db/service.ts", "r") as f:
    text = f.read()

# Replace the mentions handling in sendCommunity
old_code = """  // Parse @mentions: @username
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
          if (u.id !== session.id) {
            await tx.notification.create({
              data: {
                userId: u.id,
                type: "mention",
                text: `You were mentioned in community chat.`,
                messageId: created.id,
              },
            });
          }
        }
      }
    }"""

new_code = """  const msg = await prisma.$transaction(async (tx) => {
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

      // Avoid notifying the author if they mentioned themselves
      for (const m of mentions) {
        if (m.userId !== session.id) {
          await tx.notification.create({
            data: {
              userId: m.userId,
              type: "mention",
              text: `You were mentioned in community chat.`,
              messageId: created.id,
            },
          });
        }
      }
    }"""

text = text.replace(old_code, new_code)

with open("src/lib/db/service.ts", "w") as f:
    f.write(text)

