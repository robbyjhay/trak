/**
 * Credential helpers — Phase 0 routes through Postgres auth service.
 * Kept for call-site compatibility with set-password page and layout.
 * Passwords never exposed to the client.
 */
import "server-only";
import {
  findById,
  findByUsername,
  skipPasswordChange as authSkip,
  setInitialPassword,
} from "@/lib/services/auth.service";
import { getDevSeedPassword } from "@/lib/auth/password";

/** Looks up a sign-in row by username (case-insensitive). */
export async function findCredentialByUsername(username: string) {
  const user = await findByUsername(username);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Look up a sign-in row by Postgres user id. */
export async function findCredentialByUserId(userId: string) {
  const user = await findById(userId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Replace a user's password hash and clear the forced-change flag.
 * Prefer setInitialPassword / changePassword services for policy enforcement.
 */
export async function updateCredentialPassword(
  userId: string,
  passwordHash: string,
  clearMustChange = true,
) {
  const { prisma } = await import("@/lib/db/prisma");
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      ...(clearMustChange ? { mustChangePassword: false } : {}),
    },
  });
}

/** Clear the forced password-change flag without changing the password. */
export async function skipPasswordChange(userId: string) {
  await authSkip(userId);
}

export { setInitialPassword };

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  const { verifyPassword: verify } = await import("@/lib/auth/password");
  return verify(plain, hash);
}

/**
 * Dev-only plaintext for quick-select autofill.
 * Null when ENABLE_DEV_LOGIN is off or production.
 */
export function getDevPlainPassword(): string | null {
  return getDevSeedPassword();
}

/** @deprecated Use getDevPlainPassword — no shared production constant. */
export const DEV_PLAIN_PASSWORD = getDevSeedPassword() ?? "";
