import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getSessionTokenFromCookieHeader,
  hashSessionTokenForTest,
  parseCookieHeader,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/ws-session";

describe("ws-session cookie helpers", () => {
  it("parses simple cookie headers", () => {
    const cookies = parseCookieHeader(
      `${SESSION_COOKIE_NAME}=abc123tokenvaluehere; other=1`,
    );
    expect(cookies[SESSION_COOKIE_NAME]).toBe("abc123tokenvaluehere");
    expect(cookies.other).toBe("1");
  });

  it("returns null for missing or short session tokens", () => {
    expect(getSessionTokenFromCookieHeader(undefined)).toBeNull();
    expect(getSessionTokenFromCookieHeader("foo=bar")).toBeNull();
    expect(
      getSessionTokenFromCookieHeader(`${SESSION_COOKIE_NAME}=short`),
    ).toBeNull();
  });

  it("extracts session token meeting minimum length", () => {
    const token = "a".repeat(32);
    expect(
      getSessionTokenFromCookieHeader(`${SESSION_COOKIE_NAME}=${token}`),
    ).toBe(token);
  });

  it("hashes tokens with SHA-256 hex (auth.service compatible)", () => {
    const raw = "test-opaque-session-token-value";
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");
    expect(hashSessionTokenForTest(raw)).toBe(expected);
  });

  it("decodes URI-encoded cookie values", () => {
    const token = "a".repeat(32);
    const header = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
    expect(getSessionTokenFromCookieHeader(header)).toBe(token);
  });
});
