import { createHash, randomBytes } from "node:crypto";
import { describe, expect, test } from "vitest";

/** Mirrors server-side RSVP token generation / hashing. */
function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

describe("RSVP cryptographic tokens", () => {
  test("generates non-sequential opaque tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    // Must not look like legacy sequential ids (tok_1001)
    expect(a).not.toMatch(/^tok_\d+$/);
  });

  test("hash is deterministic and one-way shape", () => {
    const raw = generateOpaqueToken();
    const h1 = hashToken(raw);
    const h2 = hashToken(raw);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(raw);
  });

  test("different tokens produce different hashes", () => {
    expect(hashToken("alpha-token-value-here")).not.toBe(
      hashToken("beta-token-value-here"),
    );
  });
});
