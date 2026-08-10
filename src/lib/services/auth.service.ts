/**
 * Auth service — opaque sessions, login/logout, password ops (Phase 0).
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  passwordPolicyMessage,
} from "@/lib/auth/password";
import { getEnv } from "@/lib/env";
import type { SessionUser } from "@/lib/types";
import type { User, UserProfile, UserRole as DbUserRole } from "@prisma/client";

const TOKEN_BYTES = 32;
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthUserRow = User & { profile: UserProfile | null };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function mapRole(role: DbUserRole): SessionUser["role"] {
  return role === "head" ? "head" : "member";
}

/**
 * Build SessionUser for the app shell.
 * `id` is the Postgres user UUID (authoritative). Domain JSON still keys by
 * legacy string ids until Phase 1 — callers that need domain identity should
 * resolve via username (see resolveDomainUserId).
 */
export function toSessionUser(user: AuthUserRow): SessionUser {
  return {
    id: user.id,
    authUserId: user.id,
    name: user.profile?.name ?? user.username,
    username: user.username,
    role: mapRole(user.role),
    isSecretary: user.isSecretary,
    isCorps: user.isCorps,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function findByUsername(
  username: string,
): Promise<AuthUserRow | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;
  return prisma.user.findUnique({
    where: { usernameNormalized: normalized },
    include: { profile: true },
  });
}

export async function findById(id: string): Promise<AuthUserRow | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
}

export async function createSession(
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null },
): Promise<{ rawToken: string; expiresAt: Date; sessionId: string }> {
  const env = getEnv();
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ip?.slice(0, 64) ?? null,
      userAgent: meta?.userAgent?.slice(0, 512) ?? null,
    },
  });

  return { rawToken, expiresAt, sessionId: session.id };
}

export async function validateSession(
  rawToken: string,
): Promise<{ user: SessionUser; sessionId: string } | null> {
  if (!rawToken || rawToken.length < 16) return null;
  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.isActive) return null;

  // Throttle lastUsedAt updates
  const now = Date.now();
  if (now - session.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        /* non-critical */
      });
  }

  return {
    user: toSessionUser(session.user),
    sessionId: session.id,
  };
}

export async function login(
  username: string,
  password: string,
  meta?: { ip?: string | null; userAgent?: string | null },
): Promise<{
  user: SessionUser;
  rawToken: string;
  mustChangePassword: boolean;
}> {
  const user = await findByUsername(username);
  // Constant-ish failure path: still verify against dummy if missing
  if (!user || !user.isActive) {
    await verifyPassword(password, "$2a$12$invalidhashinvalidhashinvalidhashinv");
    throw new AuthError(
      401,
      "UNAUTHORIZED",
      "Username or password not recognised.",
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AuthError(
      401,
      "UNAUTHORIZED",
      "Username or password not recognised.",
    );
  }

  const { rawToken } = await createSession(user.id, meta);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  try {
    const { recordAuditEvent } = await import("@/lib/services/audit.service");
    await recordAuditEvent({
      userId: user.id,
      action: "login",
      targetId: user.id,
      targetType: "user",
      ipAddress: meta?.ip ?? undefined,
      userAgent: meta?.userAgent ?? undefined,
    });
  } catch {
    /* non-critical */
  }

  const sessionUser = toSessionUser(user);
  return {
    user: sessionUser,
    rawToken,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function logout(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function setInitialPassword(
  userId: string,
  password: string,
  confirm: string,
  username?: string,
): Promise<void> {
  const user = await findById(userId);
  if (!user) {
    throw new AuthError(401, "UNAUTHORIZED", "Not authenticated.");
  }
  if (!user.mustChangePassword) {
    throw new AuthError(
      400,
      "VALIDATION_ERROR",
      "Password change is not required.",
    );
  }

  const policyErr = validatePasswordPolicy(password, {
    username: username ?? user.username,
    confirm,
  });
  if (policyErr) {
    throw new AuthError(
      400,
      "VALIDATION_ERROR",
      passwordPolicyMessage(policyErr),
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  try {
    const { recordAuditEvent } = await import("@/lib/services/audit.service");
    await recordAuditEvent({
      userId,
      action: "password_change",
      targetId: userId,
      targetType: "user",
    });
  } catch {
    /* non-critical */
  }

  if (user.email) {
    try {
      const { sendPasswordChangedEmail } = await import(
        "@/lib/services/email.service"
      );
      await sendPasswordChangedEmail(user.email);
    } catch {
      /* non-critical */
    }
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirm: string,
  opts?: { revokeOthers?: boolean; currentSessionId?: string },
): Promise<void> {
  const user = await findById(userId);
  if (!user) {
    throw new AuthError(401, "UNAUTHORIZED", "Not authenticated.");
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new AuthError(400, "VALIDATION_ERROR", "Current password is incorrect.");
  }

  const policyErr = validatePasswordPolicy(newPassword, {
    username: user.username,
    confirm,
  });
  if (policyErr) {
    throw new AuthError(
      400,
      "VALIDATION_ERROR",
      passwordPolicyMessage(policyErr),
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  if (opts?.revokeOthers !== false) {
    await revokeAllSessions(userId, opts?.currentSessionId);
  }

  try {
    const { recordAuditEvent } = await import("@/lib/services/audit.service");
    await recordAuditEvent({
      userId,
      action: "password_change",
      targetId: userId,
      targetType: "user",
    });
  } catch {
    /* non-critical */
  }

  if (user.email) {
    try {
      const { sendPasswordChangedEmail } = await import(
        "@/lib/services/email.service"
      );
      await sendPasswordChangedEmail(user.email);
    } catch {
      /* non-critical */
    }
  }
}

/**
 * Clear mustChangePassword without changing the password.
 * DEV ONLY — caller must gate with ENABLE_DEV_LOGIN.
 */
export async function skipPasswordChange(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: false },
  });
}
