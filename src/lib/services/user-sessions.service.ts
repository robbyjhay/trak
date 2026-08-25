import { prisma } from "@/lib/db/prisma";

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { lastUsedAt: "desc" },
  });
}

export async function revokeSessionById(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
