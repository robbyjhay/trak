import re

with open("src/lib/db/mappers.ts", "r") as f:
    mappers = f.read()

mapper_old_sig = '''export function mapCommunity(
  row: DbCommunity & { attachments?: DbMessageAttachment[] },
  deletedForMeIds?: Set<string>,
): CommunityMessage {
  const isDeleted = Boolean(row.deletedAt) || Boolean(deletedForMeIds?.has(row.id));
  return {
    id: row.id,
    from: row.fromUserId,
    text: isDeleted ? "This message was deleted." : row.text,
    at: row.createdAt.toISOString(),
    replyToId: row.replyToId,
    attachments: isDeleted ? undefined : row.attachments?.map(mapMessageAttachment),
    isDeleted,
  };
}'''

mapper_new_sig = '''export function mapCommunity(
  row: DbCommunity & { 
    attachments?: DbMessageAttachment[];
    mentions?: (DbMention & { user?: { id: string; profile?: { name: string } | null } })[];
  },
  deletedForMeIds?: Set<string>,
): CommunityMessage {
  const isDeleted = Boolean(row.deletedAt) || Boolean(deletedForMeIds?.has(row.id));
  return {
    id: row.id,
    from: row.fromUserId,
    text: isDeleted ? "This message was deleted." : row.text,
    at: row.createdAt.toISOString(),
    replyToId: row.replyToId,
    attachments: isDeleted ? undefined : row.attachments?.map(mapMessageAttachment),
    mentions: isDeleted ? undefined : row.mentions?.map((m) => ({
      userId: m.userId,
      displayName: m.user?.profile?.name ?? m.user?.id ?? "Unknown",
      position: m.position,
    })),
    isDeleted,
  };
}'''

mappers = mappers.replace(mapper_old_sig, mapper_new_sig)
with open("src/lib/db/mappers.ts", "w") as f:
    f.write(mappers)


with open("src/lib/db/service.ts", "r") as f:
    service = f.read()

service_list_old = '''    prisma.communityMessage.findMany({
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        attachments: true,
        ...(opts?.userId ? { deletedBy: { where: { userId: opts.userId }, select: { id: true } } } : {})
      }
    }),'''

service_list_new = '''    prisma.communityMessage.findMany({
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        attachments: true,
        mentions: { include: { user: { include: { profile: true } } } },
        ...(opts?.userId ? { deletedBy: { where: { userId: opts.userId }, select: { id: true } } } : {})
      }
    }),'''

service = service.replace(service_list_old, service_list_new)
with open("src/lib/db/service.ts", "w") as f:
    f.write(service)

