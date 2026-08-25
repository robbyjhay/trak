/**
 * Password hashing (bcrypt cost 12 per AUDIT_05).
 * Never log plaintext passwords. Never return passwordHash to clients.
 */
import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

const DEFAULT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

function bcryptCost(): number {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return DEFAULT_COST;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 10 || n > 15) return DEFAULT_COST;
  return n;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, bcryptCost());
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type PasswordPolicyError =
  | "too_short"
  | "too_long"
  | "equals_username"
  | "mismatch";

/**
 * Phase 0 policy: min 12, max 128, not equal to username.
 * Common-password denylist deferred to Phase 1 if file is large.
 */
export function validatePasswordPolicy(
  password: string,
  opts?: { username?: string; confirm?: string },
): PasswordPolicyError | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (password.length > MAX_PASSWORD_LENGTH) return "too_long";
  if (
    opts?.username &&
    password.toLowerCase() === opts.username.toLowerCase()
  ) {
    return "equals_username";
  }
  if (opts?.confirm !== undefined && password !== opts.confirm) {
    return "mismatch";
  }
  return null;
}

export function passwordPolicyMessage(err: PasswordPolicyError): string {
  switch (err) {
    case "too_short":
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "too_long":
      return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
    case "equals_username":
      return "Password must not be the same as your username.";
    case "mismatch":
      return "Passwords do not match.";
  }
}

/** Cryptographically random temporary password (never a shared constant). */
export function generateTemporaryPassword(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Dev seed password — only when ENABLE_DEV_LOGIN is on.
 * Falls back to a non-shared documented local default for empty DEV_SEED_PASSWORD.
 */
export function getDevSeedPassword(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const enabled =
    process.env.ENABLE_DEV_LOGIN === "true" ||
    process.env.ENABLE_DEV_LOGIN === "1";
  if (!enabled) return null;
  const fromEnv = process.env.DEV_SEED_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= MIN_PASSWORD_LENGTH) return fromEnv;
  return "TrakDevPass123!";
}

export {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
};


export function encryptString(plaintext: string): string {
  const secret = getEnv().TRAK_SESSION_SECRET;
  const key = crypto.createHash("sha256").update(secret).digest();
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  
  return `${iv.toString("base64")}:${authTag}:${encrypted}`;
}

export function decryptString(ciphertext: string): string {
  const secret = getEnv().TRAK_SESSION_SECRET;
  const key = crypto.createHash("sha256").update(secret).digest();
  
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  
  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
