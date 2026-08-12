import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/log";
import { checkRedisReady } from "@/lib/auth/rate-limit";

/**
 * Readiness probe — database is reachable and (if multi) Redis is ready.
 */
export async function GET() {
  const start = performance.now();
  const isMulti = process.env.TRAK_RUNTIME_MODE === "multi";

  try {
    await prisma.$queryRaw`SELECT 1`;
    let redisUp = true;
    
    if (isMulti) {
      redisUp = await checkRedisReady();
      if (!redisUp) {
        throw new Error("Redis not ready in multi-instance mode");
      }
    }

    const latencyMs = Math.round(performance.now() - start);
    const data = {
      status: "ready",
      database: "up",
      redis: isMulti ? "up" : "optional",
      version: process.env.APP_VERSION || process.env.npm_package_version || "0.1.0",
      ts: new Date().toISOString(),
      latencyMs,
    };
    log.info("probe_readiness", data);
    return NextResponse.json(data);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const data = {
      status: "not_ready",
      database: "down_or_redis_down",
      version: process.env.APP_VERSION || process.env.npm_package_version || "0.1.0",
      ts: new Date().toISOString(),
      latencyMs,
    };
    log.error("probe_readiness_failed", err, data);
    return NextResponse.json(data, { status: 503 });
  }
}
