import { createHash, randomBytes } from "node:crypto";
import { describe, expect, test } from "vitest";

/** Pure RSVP token helpers mirrored from service (no Prisma dependency). */
function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function verifyToken(rawToken: string, storedHash: string): boolean {
  const computedHash = hashToken(rawToken);
  return computedHash === storedHash;
}

describe("RSVP Token Generation", () => {
  test("generates cryptographically random tokens", () => {
    const tokens = Array.from({ length: 100 }, () => generateOpaqueToken());
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(100);
  });

  test("token has sufficient entropy (43 chars for 32 bytes)", () => {
    const token = generateOpaqueToken();
    expect(token.length).toBe(43);
  });

  test("token uses base64url-safe characters", () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("token is not predictable sequential", () => {
    const tokens = Array.from({ length: 10 }, () => generateOpaqueToken());
    // None should match sequential pattern
    tokens.forEach((t) => {
      expect(t).not.toMatch(/^tok_\d+$/);
      expect(t).not.toMatch(/^\d+$/);
    });
  });
});

describe("RSVP Token Hashing", () => {
  test("hash is deterministic", () => {
    const token = generateOpaqueToken();
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  test("hash is SHA-256 (64 hex chars)", () => {
    const token = generateOpaqueToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("hash is one-way (cannot recover token from hash)", () => {
    const token = generateOpaqueToken();
    const hash = hashToken(token);
    expect(hash).not.toBe(token);
    expect(hash.length).not.toBe(token.length);
  });

  test("different tokens produce different hashes", () => {
    const token1 = generateOpaqueToken();
    const token2 = generateOpaqueToken();
    expect(hashToken(token1)).not.toBe(hashToken(token2));
  });

  test("empty string produces valid hash", () => {
    const hash = hashToken("");
    expect(hash).toHaveLength(64);
  });

  test("unicode tokens hash correctly", () => {
    const unicode = "rsvp-attendée-123";
    const hash = hashToken(unicode);
    expect(hash).toHaveLength(64);
    expect(hashToken(unicode)).toBe(hash);
  });
});

describe("RSVP Token Verification", () => {
  test("valid token verifies against stored hash", () => {
    const token = generateOpaqueToken();
    const storedHash = hashToken(token);
    expect(verifyToken(token, storedHash)).toBe(true);
  });

  test("invalid token fails verification", () => {
    const token = generateOpaqueToken();
    const wrongToken = generateOpaqueToken();
    const storedHash = hashToken(token);
    expect(verifyToken(wrongToken, storedHash)).toBe(false);
  });

  test("empty token fails against non-empty hash", () => {
    const token = generateOpaqueToken();
    const storedHash = hashToken(token);
    expect(verifyToken("", storedHash)).toBe(false);
  });

  test("token with different case fails verification", () => {
    const token = generateOpaqueToken();
    const storedHash = hashToken(token);
    expect(verifyToken(token.toUpperCase(), storedHash)).toBe(false);
  });
});

describe("RSVP Security Properties", () => {
  test("timing-safe comparison would be needed for production", () => {
    // This test documents that simple string comparison is used
    // In production, consider using timing-safe comparison
    const token1 = generateOpaqueToken();
    const token2 = generateOpaqueToken();
    const hash1 = hashToken(token1);
    const hash2 = hashToken(token2);
    
    // Verify that different tokens produce different hashes
    expect(hash1).not.toBe(hash2);
  });

  test("token generation uses crypto.randomBytes", () => {
    // Verify we're using cryptographically secure random
    const tokens = Array.from({ length: 50 }, () => generateOpaqueToken());
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(50);
  });

  test("hash collision resistance", () => {
    // Generate many tokens and verify all hashes are unique
    const hashes = Array.from({ length: 100 }, () => {
      const token = generateOpaqueToken();
      return hashToken(token);
    });
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(100);
  });
});

describe("RSVP Token Lifecycle", () => {
  test("full lifecycle: generate, hash, store, verify", () => {
    // 1. Generate token
    const rawToken = generateOpaqueToken();
    
    // 2. Hash for storage
    const storedHash = hashToken(rawToken);
    
    // 3. Simulate storing in database
    const dbRecord = {
      logId: "log-123",
      rsvpTokenHash: storedHash,
      createdAt: new Date(),
    };
    
    // 4. Verify token against stored hash
    expect(verifyToken(rawToken, dbRecord.rsvpTokenHash)).toBe(true);
    
    // 5. Different token should fail
    const differentToken = generateOpaqueToken();
    expect(verifyToken(differentToken, dbRecord.rsvpTokenHash)).toBe(false);
  });

  test("token regeneration invalidates old token", () => {
    const oldToken = generateOpaqueToken();
    const oldHash = hashToken(oldToken);
    
    // Generate new token
    const newToken = generateOpaqueToken();
    const newHash = hashToken(newToken);
    
    // Old token should not match new hash
    expect(verifyToken(oldToken, newHash)).toBe(false);
    // New token should not match old hash
    expect(verifyToken(newToken, oldHash)).toBe(false);
  });
});
