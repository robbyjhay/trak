import "server-only";
import { prisma } from "@/lib/db/prisma";
import { encryptString, decryptString } from "@/lib/auth/password";

export async function getDefaultMemberPassword(): Promise<string | null> {
  const settings = await prisma.unitSettings.findFirst();
  if (!settings || !settings.defaultMemberPassword) return null;
  try {
    return decryptString(settings.defaultMemberPassword);
  } catch (err) {
    console.error("[settings] failed to decrypt default member password", err);
    return null;
  }
}

export async function setDefaultMemberPassword(plaintext: string): Promise<void> {
  const encrypted = encryptString(plaintext);
  const existing = await prisma.unitSettings.findFirst();
  
  if (existing) {
    await prisma.unitSettings.update({
      where: { id: existing.id },
      data: { defaultMemberPassword: encrypted },
    });
  } else {
    await prisma.unitSettings.create({
      data: { defaultMemberPassword: encrypted },
    });
  }
}
