/**
 * auth_tokens helpers — opaque one-time tokens hashed at rest.
 */

import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const TOKEN_BYTES = 32;

export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

const DEFAULT_TTL_MS: Record<AuthTokenType, number> = {
  password_reset: 60 * 60 * 1000, // 1h
  invite: 7 * 24 * 60 * 60 * 1000, // 7d
  email_verify: 48 * 60 * 60 * 1000, // 48h
  initial_password: 24 * 60 * 60 * 1000, // 24h
  onboard: 12 * 60 * 60 * 1000, // 12h
};

export async function createAuthToken(
  type: AuthTokenType,
  userId: string,
  ttlMs?: number,
  meta?: Prisma.InputJsonValue,
): Promise<{ rawToken: string; id: string; expiresAt: Date }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + (ttlMs ?? DEFAULT_TTL_MS[type]),
  );

  const row = await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt,
      ...(meta !== undefined ? { meta } : {}),
    },
  });

  return { rawToken, id: row.id, expiresAt };
}

export async function consumeAuthToken(
  rawToken: string,
  type: AuthTokenType,
): Promise<{ userId: string; id: string } | null> {
  const tokenHash = hashToken(rawToken);
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  if (row.type !== type) return null;
  if (row.consumedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  // Atomic single-use claim: only one consumer can flip consumedAt.
  const claimed = await prisma.authToken.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return { userId: row.userId, id: row.id };
}
