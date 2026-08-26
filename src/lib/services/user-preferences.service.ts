import { prisma } from "@/lib/db/prisma";

export async function getUserPreferences(userId: string) {
  let prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!prefs) {
    prefs = await prisma.userPreferences.create({ data: { userId } });
  }
  return prefs;
}

export async function updateUserPreferences(userId: string, data: Partial<any>) {
  return prisma.userPreferences.update({
    where: { userId },
    data,
  });
}
