with open("server.ts", "r") as f:
    content = f.read()

# Hunk 1: createRequire and ECONNRESET
new_header = """import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Bypass server-only error when running via raw tsx
"""
content = content.replace('// Bypass server-only error when running via raw tsx\n', new_header)

new_uncaught = """import Redis from "ioredis";

// Prevent unhandled ECONNRESET on sockets from crashing the entire server.
process.on("uncaughtException", (err: any) => {
  if (err.code === "ECONNRESET") {
    // Ignore harmless aborted connections
    return;
  }
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
"""
content = content.replace('import Redis from "ioredis";\n', new_uncaught)

# Redis zrem fix
old_redis = """          if (isMulti && redisClient) {
            redisClient.zrem("trak:ws:online", userId).catch(() => {});
          }"""
new_redis = """          // In multi-instance mode, do NOT zrem from Redis here.
          // Other instances may still have active connections for this user.
          // The TTL-based pruning (every 30s, entries >60s old) handles stale cleanup.
          // Active connections refresh their Redis timestamp via ping."""
content = content.replace(old_redis, new_redis)

with open("server.ts", "w") as f:
    f.write(content)
