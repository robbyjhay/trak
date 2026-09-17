/**
 * Cloudflare TURN short-lived credential generation (server-only).
 *
 * The TURN Token ID (`TURN_KEY_ID`) and API Token (`TURN_API_TOKEN`) are
 * server secrets — NEVER expose them to the browser, and never reference them
 * through `NEXT_PUBLIC_*`. This module is imported only from server code and
 * produces a short-lived ICE server configuration that the client receives
 * through the authenticated `/api/calls/ice-servers` endpoint.
 */

const CLOUDFLARE_BASE_URL = "https://rtc.live.cloudflare.com";
const CLOUDFLARE_GENERATE_PATH =
  "/v1/turn/keys/:keyId/credentials/generate-ice-servers";
const DEFAULT_TTL_SECONDS = 3600;

/** Cloudflare Realtime rejects TTLs above 48 hours. */
export const MAX_TTL_SECONDS = 172800;

export interface CloudflareIceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface CloudflareIceServersResponse {
  iceServers: CloudflareIceServer[];
}

export interface TurnServerCredentials {
  iceServers: RTCIceServer[];
  expiresAt: number;
  ttlSeconds: number;
}

export interface CloudflareTurnConfig {
  keyId: string;
  apiToken: string;
  ttlSeconds: number;
  baseUrl: string;
}

function serverDebug(...args: unknown[]): void {
  if (
    typeof process !== "undefined" &&
    process.env.DEBUG_CALLS === "1"
  ) {
    // eslint-disable-next-line no-console
    console.debug("[calls:server]", ...args);
  }
}

/**
 * Drop URLs browsers cannot use. Port 53 (DNS) is blocked in Chrome/Firefox
 * and only contributes a timeout when the list is probed without trickle ICE.
 */
export function filterUnusableTurnUrls(urls: string[]): string[] {
  return urls.filter((url) => !url.includes(":53"));
}

/** Normalize a Cloudflare payload into a browser-safe RTCIceServer[] list. */
export function normalizeCloudflareIceServers(
  payload: CloudflareIceServersResponse | null | undefined,
): RTCIceServer[] {
  if (!payload || !Array.isArray(payload.iceServers)) return [];
  const servers: RTCIceServer[] = [];
  for (const entry of payload.iceServers) {
    if (!entry || !Array.isArray(entry.urls)) continue;
    const urls = filterUnusableTurnUrls(entry.urls);
    if (urls.length === 0) continue;
    const server: RTCIceServer = { urls };
    if (entry.username) server.username = entry.username;
    if (entry.credential) server.credential = entry.credential;
    servers.push(server);
  }
  return servers;
}

/**
 * Call the Cloudflare Realtime generate-ice-servers API for a short-lived
 * STUN/TURN configuration. `fetchImpl` and `now` are injectable for tests.
 */
export async function generateCloudflareIceServers(
  options: {
    keyId: string;
    apiToken: string;
    ttlSeconds?: number;
    baseUrl?: string;
  },
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<TurnServerCredentials> {
  const rawTtl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const ttl =
    Number.isFinite(rawTtl) && rawTtl > 0
      ? Math.min(Math.floor(rawTtl), MAX_TTL_SECONDS)
      : DEFAULT_TTL_SECONDS;
  const baseUrl = (options.baseUrl ?? CLOUDFLARE_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${baseUrl}${CLOUDFLARE_GENERATE_PATH.replace(
    ":keyId",
    encodeURIComponent(options.keyId),
  )}`;

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Cloudflare TURN credential generation failed: HTTP ${res.status}`,
    );
  }

  const payload = (await res.json()) as CloudflareIceServersResponse;
  const iceServers = normalizeCloudflareIceServers(payload);
  if (iceServers.length === 0) {
    throw new Error("Cloudflare TURN returned no usable ICE servers");
  }

  serverDebug(
    "generated fresh ICE servers",
    iceServers.length,
    "server(s), ttl",
    ttl,
    "s",
  );
  return { iceServers, expiresAt: now() + ttl * 1000, ttlSeconds: ttl };
}

/** Read the server-only Cloudflare TURN config, or null when not configured. */
export function readCloudflareTurnConfig(
  env: Record<string, string | undefined> = ((process.env as Record<
    string,
    string | undefined
  >) ?? {}),
): CloudflareTurnConfig | null {
  const keyId = env.TURN_KEY_ID;
  const apiToken = env.TURN_API_TOKEN;
  if (!keyId || !apiToken) return null;
  const ttlRaw = Number(env.TURN_API_TTL_SECONDS);
  return {
    keyId,
    apiToken,
    ttlSeconds:
      Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : DEFAULT_TTL_SECONDS,
    baseUrl: env.TURN_API_BASE_URL || CLOUDFLARE_BASE_URL,
  };
}

let cachedCredentials: {
  iceServers: RTCIceServer[];
  expiresAt: number;
} | null = null;

/** Test helper — clears the in-process TTL cache. */
export function resetCloudflareTurnCache(): void {
  cachedCredentials = null;
}

/**
 * Return the current ICE server list for authenticated callers.
 *
 * - Not configured: `{ iceServers: [] }` so the client keeps its default
 *   STUN-only (plus any build-time NEXT_PUBLIC TURN) fallback behavior.
 * - Configured: short-lived Cloudflare STUN/TURN servers, generated once and
 *   cached for the credential TTL so the API is not hammered per request.
 * - Cloudflare failure: throws — the route maps this to a 500 with an empty
 *   list so the browser still falls back to STUN.
 */
export async function getTurnIceServers(options?: {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Promise<{ iceServers: RTCIceServer[] }> {
  const config = readCloudflareTurnConfig(options?.env);
  if (!config) {
    serverDebug("TURN not configured — client falls back to default STUN");
    return { iceServers: [] };
  }

  const now = options?.now ?? Date.now;
  const cached = cachedCredentials;
  if (cached && now() < cached.expiresAt) {
    return { iceServers: cached.iceServers };
  }

  const credentials = await generateCloudflareIceServers(
    {
      keyId: config.keyId,
      apiToken: config.apiToken,
      ttlSeconds: config.ttlSeconds,
      baseUrl: config.baseUrl,
    },
    options?.fetchImpl ?? fetch,
    now,
  );
  cachedCredentials = {
    iceServers: credentials.iceServers,
    expiresAt: credentials.expiresAt,
  };
  return { iceServers: credentials.iceServers };
}