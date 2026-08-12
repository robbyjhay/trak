/**
 * WebSocket session validation for the custom Node entrypoint (`server.ts`).
 *
 * Intentionally does NOT use `server-only`, Next cookies(), or the Prisma
 * singleton — those throw or are unavailable under plain `tsx server.ts`.
 * Cookie name and token hashing MUST stay aligned with auth.service / session.ts.
 */
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

export { SESSION_COOKIE_NAME };

const TOKEN_MIN_LEN = 16;

let pool: Pool | null = null;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Parse a Cookie header into a name→value map.
 * Handles simple `a=b; c=d` cookies (session tokens are base64url — no `;`/`,` issues).
 */
export function parseCookieHeader(
  cookieHeader: string | undefined | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function getSessionTokenFromCookieHeader(
  cookieHeader: string | undefined | null,
): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token || token.length < TOKEN_MIN_LEN) return null;
  return token;
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      console.error("[ws-session] pg pool error", err.message);
    });
  }
  return pool;
}

/**
 * Resolve authenticated user id from a WebSocket upgrade Cookie header.
 * Returns null if missing/invalid/expired/revoked/inactive or DB unavailable.
 */
export async function getSessionUserIdFromCookieHeader(
  cookieHeader: string | undefined | null,
): Promise<string | null> {
  const rawToken = getSessionTokenFromCookieHeader(cookieHeader);
  if (!rawToken) return null;

  const db = getPool();
  if (!db) {
    console.error("[ws-session] DATABASE_URL not set — rejecting WS auth");
    return null;
  }

  const tokenHash = hashToken(rawToken);

  try {
    const result = await db.query<{ user_id: string }>(
      `SELECT s.user_id
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.is_active = true
       LIMIT 1`,
      [tokenHash],
    );
    const row = result.rows[0];
    return row?.user_id ?? null;
  } catch (err) {
    console.error(
      "[ws-session] session lookup failed",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Optional: close pool on process shutdown (tests / graceful stop). */
export async function closeWsSessionPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Exported for unit tests — same algorithm as auth.service. */
export function hashSessionTokenForTest(raw: string): string {
  return hashToken(raw);
}
