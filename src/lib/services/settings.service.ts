import "server-only";
import { prisma } from "@/lib/db/prisma";
import { encryptString, decryptString } from "@/lib/auth/password";

export async function getDefaultMemberPassword(): Promise<string | null> {
  let settings;
  try {
    settings = await prisma.unitSettings.findFirst();
  } catch (err) {
    console.error("[settings] failed to query unitSettings (table may be missing)", err);
    return null;
  }
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
  try {
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
  } catch (err) {
    console.error("[settings] failed to upsert default password (table may be missing)", err);
    throw new Error("Could not save settings. The database schema might be out of date.");
  }
}
