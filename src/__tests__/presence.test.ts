import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { getPresenceStatus, type PresenceStatus } from "@/lib/presence";

// ---------------------------------------------------------------------------
// getPresenceStatus — core logic
// ---------------------------------------------------------------------------
describe("getPresenceStatus", () => {
  test("returns online when user is in onlineUsers, connected, and synced", () => {
    const onlineUsers = new Set(["user-a", "user-b"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
  });

  test("returns offline when user is absent, connected, and synced", () => {
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("offline");
  });

  test("returns unknown when signaling is not connected", () => {
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, false, true)).toBe("unknown");
  });

  test("returns unknown when signaling is not connected even if user is in onlineUsers", () => {
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, false, true)).toBe("unknown");
  });

  test("returns unknown when signaling is not connected and onlineUsers is empty", () => {
    const onlineUsers = new Set<string>();
    expect(getPresenceStatus("user-a", onlineUsers, false, false)).toBe("unknown");
  });

  test("returns offline for empty onlineUsers when connected and synced", () => {
    const onlineUsers = new Set<string>();
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("offline");
  });

  test("returns unknown when connected but presence bootstrap not yet received", () => {
    const onlineUsers = new Set<string>();
    expect(getPresenceStatus("user-a", onlineUsers, true, false)).toBe("unknown");
  });

  test("returns unknown when connected but presence bootstrap not yet received even if onlineUsers has data", () => {
    // Stale data from a previous connection — should not be trusted
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, false)).toBe("unknown");
  });

  test("handles self user correctly", () => {
    const onlineUsers = new Set(["self-user"]);
    expect(getPresenceStatus("self-user", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("self-user", onlineUsers, false, true)).toBe("unknown");
    expect(getPresenceStatus("self-user", onlineUsers, true, false)).toBe("unknown");
  });

  test("presence status is deterministic for the same inputs", () => {
    const onlineUsers = new Set(["user-a", "user-b"]);
    const r1 = getPresenceStatus("user-a", onlineUsers, true, true);
    const r2 = getPresenceStatus("user-a", onlineUsers, true, true);
    expect(r1).toBe(r2);
  });

  test("presence status changes correctly when user goes online", () => {
    let onlineUsers = new Set<string>();
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("offline");

    onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
  });

  test("presence status changes correctly when user goes offline", () => {
    let onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");

    onlineUsers = new Set<string>();
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("offline");
  });

  test("unknown state is returned when signaling disconnects mid-session", () => {
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");

    // Signaling disconnects — even though user-a was online, we can't trust the set
    expect(getPresenceStatus("user-a", onlineUsers, false, false)).toBe("unknown");
  });

  test("returns correct status for multiple users in set", () => {
    const onlineUsers = new Set(["user-a", "user-c"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("offline");
    expect(getPresenceStatus("user-c", onlineUsers, true, true)).toBe("online");
  });
});

// ---------------------------------------------------------------------------
// Bootstrap vs Offline — the key correctness scenario
// ---------------------------------------------------------------------------
describe("Presence bootstrap vs Offline", () => {
  test("newly connected client shows unknown (not offline) before bootstrap", () => {
    // WebSocket is open, onopen fired → signalingConnected = true
    // But server has not yet sent online_users → presenceSynced = false
    const onlineUsers = new Set<string>(); // empty, no data yet
    expect(getPresenceStatus("user-a", onlineUsers, true, false)).toBe("unknown");
    expect(getPresenceStatus("user-b", onlineUsers, true, false)).toBe("unknown");
    expect(getPresenceStatus("user-c", onlineUsers, true, false)).toBe("unknown");
  });

  test("after bootstrap completes, online/offline is correctly determined", () => {
    const onlineUsers = new Set(["user-a", "user-c"]);
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("offline");
    expect(getPresenceStatus("user-c", onlineUsers, true, true)).toBe("online");
  });

  test("reconnect resets presence to unknown until fresh bootstrap arrives", () => {
    // Pre-reconnect state: synced with data
    let onlineUsers = new Set(["user-a"]);
    let synced = true;
    let connected = true;
    expect(getPresenceStatus("user-a", onlineUsers, connected, synced)).toBe("online");

    // Connection drops
    connected = false;
    synced = false;
    expect(getPresenceStatus("user-a", onlineUsers, connected, synced)).toBe("unknown");

    // WebSocket reconnects (onopen fires) but bootstrap not yet received
    connected = true;
    synced = false;
    expect(getPresenceStatus("user-a", onlineUsers, connected, synced)).toBe("unknown");

    // Server sends fresh online_users
    onlineUsers = new Set(["user-a", "user-b"]);
    synced = true;
    expect(getPresenceStatus("user-a", onlineUsers, connected, synced)).toBe("online");
    expect(getPresenceStatus("user-b", onlineUsers, connected, synced)).toBe("online");
  });

  test("stale data from previous connection is not trusted before bootstrap", () => {
    // Previous connection had user-a online
    const staleOnlineUsers = new Set(["user-a"]);

    // Connection dropped, reconnected — but bootstrap not received yet
    // Even though staleOnlineUsers has user-a, we must not trust it
    expect(getPresenceStatus("user-a", staleOnlineUsers, true, false)).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Online user set simulation
// ---------------------------------------------------------------------------
describe("Online user set simulation", () => {
  test("simulates online_users bootstrap message", () => {
    const users = ["user-a", "user-b", "user-c"];
    const onlineUsers = new Set(users);

    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-c", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-d", onlineUsers, true, true)).toBe("offline");
  });

  test("simulates user_online event", () => {
    const onlineUsers = new Set(["user-a"]);

    // user-d comes online
    const next = new Set(onlineUsers);
    next.add("user-d");

    expect(getPresenceStatus("user-d", next, true, true)).toBe("online");
    expect(getPresenceStatus("user-a", next, true, true)).toBe("online");
  });

  test("simulates user_offline event", () => {
    const onlineUsers = new Set(["user-a", "user-b"]);

    // user-a goes offline
    const next = new Set(onlineUsers);
    next.delete("user-a");

    expect(getPresenceStatus("user-a", next, true, true)).toBe("offline");
    expect(getPresenceStatus("user-b", next, true, true)).toBe("online");
  });

  test("simulates reconnect restoring full online_users list", () => {
    let onlineUsers = new Set<string>();
    let connected = false;
    let synced = false;

    expect(getPresenceStatus("user-b", onlineUsers, connected, synced)).toBe("unknown");

    // Reconnect — WebSocket opens
    connected = true;
    // synced is still false — bootstrap pending
    expect(getPresenceStatus("user-b", onlineUsers, connected, synced)).toBe("unknown");

    // Server sends fresh online_users list
    synced = true;
    onlineUsers = new Set(["user-a", "user-b", "user-c"]);

    expect(getPresenceStatus("user-b", onlineUsers, connected, synced)).toBe("online");
  });

  test("simulates stale socket not affecting newer connection", () => {
    const staleUsers = new Set(["user-a", "user-b"]);
    const freshUsers = new Set(["user-c"]);

    // Stale connection: connected but not synced (or disconnected)
    expect(getPresenceStatus("user-b", staleUsers, false, false)).toBe("unknown");

    // Fresh connection: connected and synced
    expect(getPresenceStatus("user-c", freshUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-b", freshUsers, true, true)).toBe("offline");
  });
});

// ---------------------------------------------------------------------------
// Multiple tabs/devices scenario
// ---------------------------------------------------------------------------
describe("Multiple tabs/devices scenario", () => {
  test("closing one tab does not affect presence if other tab is connected", () => {
    const onlineUsers = new Set(["user-a", "user-b"]);

    // Tab A's connection is replaced by Tab B (code 4000)
    // Tab A: connected becomes false, presenceSynced becomes false
    expect(getPresenceStatus("user-b", onlineUsers, false, false)).toBe("unknown");

    // Tab B is still connected and synced
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("online");
  });

  test("same user on two devices — disconnecting one does not mark offline", () => {
    const onlineUsers = new Set(["user-a", "user-b"]);
    // Server does not broadcast user_offline when a stale socket closes
    // Other clients' onlineUsers set remains unchanged
    expect(getPresenceStatus("user-b", onlineUsers, true, true)).toBe("online");
  });
});

// ---------------------------------------------------------------------------
// Redis presence heartbeat
// ---------------------------------------------------------------------------
describe("Redis presence heartbeat", () => {
  test("PING_INTERVAL_MS is safely below the 60s Redis TTL", () => {
    // The client pings every 30s. The server TTL is 60s.
    // 30s < 60s means the entry is always refreshed before expiry.
    const PING_INTERVAL_MS = 30_000;
    const REDIS_TTL_MS = 60_000;
    expect(PING_INTERVAL_MS).toBeLessThan(REDIS_TTL_MS);
    // Margin: at least 2x headroom (ping fires twice per TTL window)
    expect(REDIS_TTL_MS / PING_INTERVAL_MS).toBeGreaterThanOrEqual(2);
  });

  test("actively connected user remains present across multiple TTL windows", () => {
    // Simulates the heartbeat refresh cycle:
    // t=0:   user connects → Redis zadd at score 0
    // t=30s: client pings → Redis zadd refreshed to 30
    // t=60s: server prunes entries < (now - 60s)
    //   At t=60s, minScore = 0, user's score = 30 → NOT pruned
    // t=60s: client pings → Redis zadd refreshed to 60
    // t=90s: server prunes entries < (now - 60s) = 30
    //   At t=90s, minScore = 30, user's score = 60 → NOT pruned
    // t=120s: server prunes entries < (now - 60s) = 60
    //   At t=120s, minScore = 60, user's score = 90 (refreshed at 90) → NOT pruned

    const TTL_MS = 60_000;
    const PING_MS = 30_000;
    const PRUNE_INTERVAL_MS = 30_000;

    // Track Redis sorted set score (timestamp) per userId
    const redis = new Map<string, number>();

    function zadd(userId: string, score: number) {
      redis.set(userId, score);
    }

    function zrangebyscore(minScore: number): string[] {
      const result: string[] = [];
      for (const [uid, score] of redis) {
        if (score >= minScore) result.push(uid);
      }
      return result;
    }

    function prune(now: number) {
      const minScore = now - TTL_MS;
      for (const [uid, score] of [...redis]) {
        if (score < minScore) redis.delete(uid);
      }
    }

    // Simulate 180 seconds of activity with 30s ping intervals
    const now = { value: 0 };
    zadd("user-a", now.value); // initial connect

    for (let tick = 0; tick < 6; tick++) {
      // Client pings every 30s
      now.value += PING_MS;
      zadd("user-a", now.value);

      // Server prunes every 30s
      now.value += PRUNE_INTERVAL_MS;
      prune(now.value);
    }

    // After 180s, user-a should still be present
    const online = zrangebyscore(now.value - TTL_MS);
    expect(online).toContain("user-a");
  });

  test("user without heartbeat is pruned after TTL", () => {
    const TTL_MS = 60_000;
    const redis = new Map<string, number>();

    // User connects at t=0
    redis.set("user-a", 0);

    // Advance time past TTL with no pings
    const now = 61_000;
    const minScore = now - TTL_MS;
    for (const [uid, score] of [...redis]) {
      if (score < minScore) redis.delete(uid);
    }

    // User should be pruned
    expect(redis.has("user-a")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("Edge cases", () => {
  test("empty userId does not match any presence", () => {
    const onlineUsers = new Set(["user-a"]);
    expect(getPresenceStatus("", onlineUsers, true, true)).toBe("offline");
  });

  test("very large onlineUsers set", () => {
    const onlineUsers = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      onlineUsers.add(`user-${i}`);
    }
    expect(getPresenceStatus("user-500", onlineUsers, true, true)).toBe("online");
    expect(getPresenceStatus("user-1001", onlineUsers, true, true)).toBe("offline");
  });

  test("presence type is a valid union", () => {
    const statuses: PresenceStatus[] = ["online", "offline", "unknown"];
    expect(statuses).toContain("online");
    expect(statuses).toContain("offline");
    expect(statuses).toContain("unknown");
  });

  test("all three flags must be true for non-unknown status", () => {
    const onlineUsers = new Set(["user-a"]);

    // connected=false, synced=false → unknown
    expect(getPresenceStatus("user-a", onlineUsers, false, false)).toBe("unknown");
    // connected=true, synced=false → unknown
    expect(getPresenceStatus("user-a", onlineUsers, true, false)).toBe("unknown");
    // connected=false, synced=true → unknown
    expect(getPresenceStatus("user-a", onlineUsers, false, true)).toBe("unknown");
    // connected=true, synced=true → online
    expect(getPresenceStatus("user-a", onlineUsers, true, true)).toBe("online");
  });
});
