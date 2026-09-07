import { beforeEach, describe, expect, test, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (hoisted): avoid real Prisma / Next cookie store in unit tests.
// ---------------------------------------------------------------------------

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (...args: unknown[]) => mockCookieGet(...args),
    set: (...args: unknown[]) => mockCookieSet(...args),
  })),
}));

const mockSessionFindUnique = vi.fn();
const mockSessionCreate = vi.fn();
const mockSessionUpdate = vi.fn();
const mockSessionUpdateMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    session: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      create: (...args: unknown[]) => mockSessionCreate(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      updateMany: (...args: unknown[]) => mockSessionUpdateMany(...args),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  default: {
    session: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      create: (...args: unknown[]) => mockSessionCreate(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      updateMany: (...args: unknown[]) => mockSessionUpdateMany(...args),
    },
  },
}));

// Pure TTL helpers live in session-cookie.ts (no server-only / Prisma).
import {
  SECONDS_PER_DAY,
  SESSION_COOKIE_NAME,
  sessionExpiryDate,
  sessionMaxAgeSeconds,
} from "@/lib/auth/session-cookie";

import { cookies } from "next/headers";
import {
  buildSessionCookieOptions,
  COOKIE_NAME,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  createSession,
  validateSession,
} from "@/lib/services/auth.service";
import { getEnv } from "@/lib/env";

const TTL_DAYS = 7;
const EXPECTED_MAX_AGE = 7 * 24 * 60 * 60; // 604800 seconds

function stubEnv() {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/trak_test?schema=public",
  );
  vi.stubEnv(
    "TRAK_SESSION_SECRET",
    "test-secret-32-bytes-minimum-length!!",
  );
  vi.stubEnv("SESSION_TTL_DAYS", String(TTL_DAYS));
  vi.stubEnv("NODE_ENV", "test");
}

function mockActiveUser() {
  return {
    id: "user-123",
    username: "testuser",
    role: "member",
    isSecretary: false,
    isCorps: false,
    isIntern: false,
    isActive: true,
    mustChangePassword: false,
    profile: { name: "Test User" },
  };
}

function mockSessionRow(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: "session-123",
    revokedAt: null,
    expiresAt: new Date(now + EXPECTED_MAX_AGE * 1000),
    lastUsedAt: new Date(now - 10 * 60 * 1000),
    user: mockActiveUser(),
    ...overrides,
  };
}

beforeEach(() => {
  stubEnv();
  vi.clearAllMocks();
  mockCookieGet.mockReturnValue(undefined);
  // prisma.session.update for lastUsedAt throttle — fire-and-forget.
  mockSessionUpdate.mockResolvedValue({});
});

describe("session TTL math (single authoritative TTL)", () => {
  test("SECONDS_PER_DAY is 86400", () => {
    expect(SECONDS_PER_DAY).toBe(86400);
  });

  test("sessionMaxAgeSeconds returns seconds (not ms)", () => {
    // Regression: Next.js `maxAge` is seconds. 7 days must be 604800,
    // not 604800000 (ms) and not 7.
    expect(sessionMaxAgeSeconds(7)).toBe(604800);
    expect(sessionMaxAgeSeconds(1)).toBe(86400);
    expect(sessionMaxAgeSeconds(TTL_DAYS)).toBe(EXPECTED_MAX_AGE);
  });

  test("sessionExpiryDate is now + TTL (aligned with DB expiresAt)", () => {
    const now = Date.now();
    const expires = sessionExpiryDate(TTL_DAYS, now);
    expect(expires).toBeInstanceOf(Date);
    expect(expires.getTime()).toBe(now + EXPECTED_MAX_AGE * 1000);
  });

  test("cookie maxAge and expires encode the same lifetime", () => {
    const now = Date.now();
    const maxAge = sessionMaxAgeSeconds(TTL_DAYS);
    const expires = sessionExpiryDate(TTL_DAYS, now);
    // Expires must equal now + maxAge*1000 (same intended lifetime).
    expect(expires.getTime() - now).toBe(maxAge * 1000);
  });
});

describe("buildSessionCookieOptions (persistent cookie attributes)", () => {
  test("includes BOTH Max-Age and Expires (not session-only)", () => {
    const opts = buildSessionCookieOptions(TTL_DAYS);
    expect(opts.maxAge).toBe(EXPECTED_MAX_AGE);
    expect(opts.expires).toBeInstanceOf(Date);
    // Persistent: positive Max-Age + future Expires. A session-only cookie
    // would have neither.
    expect(opts.maxAge).toBeGreaterThan(0);
    expect(opts.expires.getTime()).toBeGreaterThan(Date.now());
  });

  test("Max-Age and Expires correspond to configured SESSION_TTL_DAYS", () => {
    const env = getEnv();
    expect(env.SESSION_TTL_DAYS).toBe(TTL_DAYS);
    const before = Date.now();
    const opts = buildSessionCookieOptions(env.SESSION_TTL_DAYS, before);
    expect(opts.maxAge).toBe(env.SESSION_TTL_DAYS * 24 * 60 * 60);
    expect(opts.expires.getTime()).toBe(
      before + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  test("preserves security attributes", () => {
    const opts = buildSessionCookieOptions(TTL_DAYS);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    // NODE_ENV=test → not prod → Secure off (prod keeps Secure on).
    expect(opts.secure).toBe(false);
  });
});

describe("setSessionCookie (regression: missing Expires)", () => {
  test("sets cookie name, token, Max-Age AND Expires", async () => {
    await setSessionCookie("raw-token-value-1234567890");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name, value, opts] = mockCookieSet.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(SESSION_COOKIE_NAME);
    expect(name).toBe(COOKIE_NAME);
    expect(value).toBe("raw-token-value-1234567890");

    // THE regression: both attributes must be present.
    expect(opts).toHaveProperty("maxAge");
    expect(opts).toHaveProperty("expires");
    expect(opts.maxAge).toBe(EXPECTED_MAX_AGE);
    expect(opts.expires).toBeInstanceOf(Date);
  });

  test("cookie lifetime matches SESSION_TTL_DAYS", async () => {
    const before = Date.now();
    await setSessionCookie("another-token-1234567890");
    const opts = mockCookieSet.mock.calls[0][2] as {
      maxAge: number;
      expires: Date;
    };
    const env = getEnv();
    expect(opts.maxAge).toBe(env.SESSION_TTL_DAYS * 24 * 60 * 60);
    // Allow small clock skew between `before` and the内部 Date.now().
    expect(opts.expires.getTime()).toBeGreaterThanOrEqual(
      before + opts.maxAge * 1000 - 5000,
    );
    expect(opts.expires.getTime()).toBeLessThanOrEqual(
      Date.now() + opts.maxAge * 1000 + 5000,
    );
  });

  test("does not weaken security: httpOnly + sameSite + path", async () => {
    await setSessionCookie("token-12345678901234567890");
    const opts = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
  });

  test("writes via Next cookies() store", async () => {
    await setSessionCookie("token-xyz-1234567890123456");
    expect(cookies).toHaveBeenCalled();
    expect(mockCookieSet).toHaveBeenCalledOnce();
  });
});

describe("createSession DB expiration (alignment with cookie)", () => {
  test("DB expiresAt is now + SESSION_TTL_DAYS", async () => {
    const before = Date.now();
    mockSessionCreate.mockImplementation(async ({ data }: any) => ({
      id: "new-session-id",
      ...data,
    }));

    const { expiresAt } = await createSession("user-123");

    expect(mockSessionCreate).toHaveBeenCalledOnce();
    const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + ttlMs - 5000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + ttlMs + 5000);
  });

  test("DB expiresAt aligns with cookie Expires (same TTL)", async () => {
    const now = Date.now();
    mockSessionCreate.mockImplementation(async ({ data }: any) => ({
      id: "new-session-id",
      ...data,
    }));
    const { expiresAt } = await createSession("user-123");
    const cookieOpts = buildSessionCookieOptions(TTL_DAYS, now);

    // Both derive from SESSION_TTL_DAYS → expire at approximately the same time.
    expect(Math.abs(expiresAt.getTime() - cookieOpts.expires.getTime())).toBeLessThan(
      10_000,
    );
    expect(cookieOpts.maxAge * 1000).toBe(
      cookieOpts.expires.getTime() - now,
    );
  });
});

describe("validateSession authentication behavior", () => {
  test("valid session → authentication succeeds", async () => {
    mockSessionFindUnique.mockResolvedValue(mockSessionRow());
    const result = await validateSession("a".repeat(32));
    expect(result).not.toBeNull();
    expect(result?.user.username).toBe("testuser");
    expect(result?.sessionId).toBe("session-123");
  });

  test("expired DB session → authentication fails", async () => {
    mockSessionFindUnique.mockResolvedValue(
      mockSessionRow({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(validateSession("b".repeat(32))).resolves.toBeNull();
  });

  test("revoked/destroyed session → authentication fails", async () => {
    mockSessionFindUnique.mockResolvedValue(
      mockSessionRow({ revokedAt: new Date() }),
    );
    await expect(validateSession("c".repeat(32))).resolves.toBeNull();
  });

  test("missing session → authentication fails", async () => {
    mockSessionFindUnique.mockResolvedValue(null);
    await expect(validateSession("d".repeat(32))).resolves.toBeNull();
  });

  test("inactive user → authentication fails", async () => {
    mockSessionFindUnique.mockResolvedValue(
      mockSessionRow({
        user: { ...mockActiveUser(), isActive: false },
      }),
    );
    await expect(validateSession("e".repeat(32))).resolves.toBeNull();
  });

  test("short/garbage token → authentication fails without DB hit", async () => {
    await expect(validateSession("")).resolves.toBeNull();
    await expect(validateSession("short")).resolves.toBeNull();
    expect(mockSessionFindUnique).not.toHaveBeenCalled();
  });
});
