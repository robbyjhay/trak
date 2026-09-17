import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  filterUnusableTurnUrls,
  normalizeCloudflareIceServers,
  generateCloudflareIceServers,
  readCloudflareTurnConfig,
  getTurnIceServers,
  resetCloudflareTurnCache,
  MAX_TTL_SECONDS,
} from "@/lib/calls/iceServers";
import { getIceServers, resetIceServersCache } from "@/hooks/useWebRtc";

vi.mock("@/lib/auth/session", () => ({
  readSession: vi.fn(),
}));
import { readSession } from "@/lib/auth/session";

const CLOUDFLARE_PAYLOAD = {
  iceServers: [
    {
      urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"],
    },
    {
      urls: [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:53?transport=udp",
        "turn:turn.cloudflare.com:80?transport=tcp",
        "turns:turn.cloudflare.com:443?transport=tcp",
      ],
      username: "u",
      credential: "c",
    },
  ],
};

describe("filterUnusableTurnUrls", () => {
  it("drops port-53 URLs (blocked in browsers)", () => {
    const urls = [
      "stun:stun.cloudflare.com:3478",
      "stun:stun.cloudflare.com:53",
      "turn:turn.cloudflare.com:80?transport=tcp",
    ];
    expect(filterUnusableTurnUrls(urls)).toEqual([
      "stun:stun.cloudflare.com:3478",
      "turn:turn.cloudflare.com:80?transport=tcp",
    ]);
  });
});

describe("normalizeCloudflareIceServers", () => {
  it("maps a payload to browser-safe RTCIceServer[]", () => {
    const servers = normalizeCloudflareIceServers(CLOUDFLARE_PAYLOAD as any);
    expect(servers).toHaveLength(2);
    expect(servers[0].urls).toEqual(["stun:stun.cloudflare.com:3478"]);
    expect(servers[1].username).toBe("u");
    expect(servers[1].credential).toBe("c");
    expect(servers[1].urls).not.toContain(
      "turn:turn.cloudflare.com:53?transport=udp",
    );
  });

  it("returns [] for malformed/empty payloads", () => {
    expect(normalizeCloudflareIceServers(null)).toEqual([]);
    expect(normalizeCloudflareIceServers(undefined)).toEqual([]);
    expect(normalizeCloudflareIceServers({ iceServers: [] } as any)).toEqual([]);
    expect(normalizeCloudflareIceServers({ nope: 1 } as any)).toEqual([]);
  });

  it("drops servers whose urls are all unusable", () => {
    const servers = normalizeCloudflareIceServers({
      iceServers: [{ urls: ["turn:host:53?transport=udp"] }],
    } as any);
    expect(servers).toEqual([]);
  });
});

describe("generateCloudflareIceServers", () => {
  it("posts ttl with Bearer auth and returns credentials with expiry", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: any, init: any) => {
      captured = { url, init };
      return new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), { status: 201 });
    }) as typeof fetch;

    const now = () => 1_700_000_000_000;
    const creds = await generateCloudflareIceServers(
      { keyId: "key-1", apiToken: "tok", ttlSeconds: 3600 },
      fetchImpl,
      now,
    );

    expect(captured!.url).toBe(
      "https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers",
    );
    expect(captured!.init.method).toBe("POST");
    expect(
      (captured!.init.headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok");
    expect(
      (captured!.init.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/json");
    expect(JSON.parse(String(captured!.init.body))).toEqual({ ttl: 3600 });
    expect(creds.iceServers).toHaveLength(2);
    expect(creds.expiresAt).toBe(1_700_000_000_000 + 3600 * 1000);
    expect(creds.ttlSeconds).toBe(3600);
  });

  it("caps ttl at the Cloudflare max (48h)", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), {
        status: 201,
      })) as typeof fetch;
    const creds = await generateCloudflareIceServers(
      { keyId: "k", apiToken: "t", ttlSeconds: 200_000 },
      fetchImpl,
    );
    expect(creds.ttlSeconds).toBe(MAX_TTL_SECONDS);
  });

  it("throws on non-ok responses", async () => {
    const fetchImpl = (async () =>
      new Response("{}", { status: 500 })) as typeof fetch;
    await expect(
      generateCloudflareIceServers({ keyId: "k", apiToken: "t" }, fetchImpl),
    ).rejects.toThrow("HTTP 500");
  });

  it("throws when the payload yields no usable servers", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ iceServers: [] }), {
        status: 201,
      })) as typeof fetch;
    await expect(
      generateCloudflareIceServers({ keyId: "k", apiToken: "t" }, fetchImpl),
    ).rejects.toThrow("no usable ICE servers");
  });
});

describe("readCloudflareTurnConfig", () => {
  it("returns null when keyId/apiToken are missing", () => {
    expect(readCloudflareTurnConfig({})).toBeNull();
    expect(readCloudflareTurnConfig({ TURN_KEY_ID: "k" })).toBeNull();
    expect(readCloudflareTurnConfig({ TURN_API_TOKEN: "t" })).toBeNull();
  });

  it("parses keyId, apiToken, ttl and baseUrl with defaults", () => {
    const env = { TURN_KEY_ID: "key", TURN_API_TOKEN: "tok" };
    const cfg = readCloudflareTurnConfig(env)!;
    expect(cfg.keyId).toBe("key");
    expect(cfg.apiToken).toBe("tok");
    expect(cfg.ttlSeconds).toBe(3600);
    expect(cfg.baseUrl).toBe("https://rtc.live.cloudflare.com");

    const withTtl = readCloudflareTurnConfig({
      ...env,
      TURN_API_TTL_SECONDS: "7200",
      TURN_API_BASE_URL: "https://example.test",
    })!;
    expect(withTtl.ttlSeconds).toBe(7200);
    expect(withTtl.baseUrl).toBe("https://example.test");
  });
});

describe("getTurnIceServers", () => {
  afterEach(() => resetCloudflareTurnCache());

  it("returns an empty list when TURN is not configured (no API call)", async () => {
    const fetchImpl = vi.fn();
    const result = await getTurnIceServers({
      env: {},
      fetchImpl: fetchImpl as any,
    });
    expect(result).toEqual({ iceServers: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("generates fresh credentials when configured", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), {
        status: 201,
      })) as typeof fetch;
    const result = await getTurnIceServers({
      env: { TURN_KEY_ID: "k", TURN_API_TOKEN: "t" },
      fetchImpl,
    });
    expect(result.iceServers).toHaveLength(2);
  });

  it("reuses cached credentials within the TTL", async () => {
    const fetchImpl = vi.fn(
      (async () =>
        new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), {
          status: 201,
        })) as typeof fetch,
    );
    const now = vi.fn(() => 1_700_000_000_000);
    const env = { TURN_KEY_ID: "k", TURN_API_TOKEN: "t" };

    const first = await getTurnIceServers({ env, fetchImpl: fetchImpl as any, now });
    const second = await getTurnIceServers({ env, fetchImpl: fetchImpl as any, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.iceServers).toEqual(first.iceServers);
  });

  it("refetches after the credentials expire", async () => {
    const fetchImpl = vi.fn(
      (async () =>
        new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), {
          status: 201,
        })) as typeof fetch,
    );
    const start = 1_700_000_000_000;
    const now = vi.fn(() => start);
    const env = { TURN_KEY_ID: "k", TURN_API_TOKEN: "t" };

    await getTurnIceServers({ env, fetchImpl: fetchImpl as any, now });
    now.mockReturnValue(start + 3600 * 1000 + 1);
    await getTurnIceServers({ env, fetchImpl: fetchImpl as any, now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("GET /api/calls/ice-servers", () => {
  beforeEach(() => {
    resetCloudflareTurnCache();
    delete process.env.TURN_KEY_ID;
    delete process.env.TURN_API_TOKEN;
    vi.mocked(readSession).mockReset();
  });

  afterEach(() => {
    resetCloudflareTurnCache();
    delete process.env.TURN_KEY_ID;
    delete process.env.TURN_API_TOKEN;
    vi.unstubAllGlobals();
  });

  it("returns 401 for unauthenticated callers", async () => {
    vi.mocked(readSession).mockResolvedValue(null);
    const { GET } = await import("@/app/api/calls/ice-servers/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("returns generated ICE servers when authenticated + configured", async () => {
    vi.mocked(readSession).mockResolvedValue({ userId: "u1" } as never);
    process.env.TURN_KEY_ID = "k";
    process.env.TURN_API_TOKEN = "t";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(CLOUDFLARE_PAYLOAD), { status: 201 }),
      ),
    );

    const { GET } = await import("@/app/api/calls/ice-servers/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.iceServers).toHaveLength(2);
  });

  it("returns an empty list when TURN is not configured", async () => {
    vi.mocked(readSession).mockResolvedValue({ userId: "u1" } as never);
    const { GET } = await import("@/app/api/calls/ice-servers/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ iceServers: [] });
  });

  it("returns 500 with an empty list when the Cloudflare call fails", async () => {
    vi.mocked(readSession).mockResolvedValue({ userId: "u1" } as never);
    process.env.TURN_KEY_ID = "k";
    process.env.TURN_API_TOKEN = "t";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    const { GET } = await import("@/app/api/calls/ice-servers/route");
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).iceServers).toEqual([]);
  });
});

describe("getIceServers (client)", () => {
  afterEach(() => {
    resetIceServersCache();
    vi.unstubAllGlobals();
  });

  it("uses server-generated ICE servers when the API responds", async () => {
    const payload = {
      iceServers: [
        {
          urls: ["turn:turn.cloudflare.com:443?transport=tcp"],
          username: "u",
          credential: "c",
        },
      ],
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const servers = await getIceServers(1_700_000_000_000);
    expect(servers).toHaveLength(1);
    expect(servers[0]).toMatchObject({ username: "u", credential: "c" });
  });

  it("falls back to default STUN when the API returns an empty list", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ iceServers: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const servers = await getIceServers(1_700_000_000_000);
    const flat = servers.flatMap((s) =>
      Array.isArray(s.urls) ? s.urls : [s.urls],
    );
    expect(flat.some((u) => u.includes("stun.l.google.com"))).toBe(true);
  });

  it("falls back to default STUN when the API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const servers = await getIceServers(1_700_000_000_000);
    expect(
      servers.some((s) => s.urls === "stun:stun.l.google.com:19302"),
    ).toBe(true);
  });

  it("caches server-generated servers within the cache window", async () => {
    const payload = { iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }] };
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getIceServers(1000);
    await getIceServers(2000); // both inside the 5-minute cache window
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches after the cache window elapses", async () => {
    const payload = { iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }] };
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getIceServers(1000);
    await getIceServers(1000 + 5 * 60_000 + 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("only carries the generated config — no server secrets", async () => {
    const payload = {
      iceServers: [
        {
          urls: ["turn:turn.cloudflare.com:443?transport=tcp"],
          username: "u",
          credential: "c",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const servers = await getIceServers(1_700_000_000_000);
    const responseBody = JSON.stringify(servers);
    expect(responseBody).not.toContain("TURN_KEY_ID");
    expect(responseBody).not.toContain("TURN_API_TOKEN");
  });
});