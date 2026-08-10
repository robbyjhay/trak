import { createHash, randomBytes } from "node:crypto";
import { expect, test, describe } from "vitest";

/** Pure helpers mirrored from auth/tokens (avoid Prisma via tokens.ts in unit tests). */
function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}
function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

describe("Auth Tokens", () => {
  test("generates opaque token", () => {
    const token = generateOpaqueToken();
    expect(token).toBeDefined();
    // 32 bytes in base64url is 43 characters
    expect(token.length).toBe(43);
  });

  test("hashes token consistently", () => {
    const raw = "test-token-123";
    const h1 = hashToken(raw);
    const h2 = hashToken(raw);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64); // sha256 hex is 64 chars
  });
});
