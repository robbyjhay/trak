import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { log } from "@/lib/log";

/**
 * Readiness probe — database is reachable.
 */
export async function GET() {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);
    const data = {
      status: "ready",
      database: "up",
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
      database: "down",
      version: process.env.APP_VERSION || process.env.npm_package_version || "0.1.0",
      ts: new Date().toISOString(),
      latencyMs,
    };
    log.error("probe_readiness_failed", err, data);
    return NextResponse.json(data, { status: 503 });
  }
}
