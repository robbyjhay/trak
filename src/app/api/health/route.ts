import { NextResponse } from "next/server";
import { log } from "@/lib/log";

/**
 * Liveness probe — process is up. No DB check.
 */
export async function GET() {
  const start = performance.now();
  const data = {
    status: "ok",
    service: "trak",
    version: process.env.APP_VERSION || process.env.npm_package_version || "0.1.0",
    ts: new Date().toISOString(),
    latencyMs: 0,
  };
  data.latencyMs = Math.round(performance.now() - start);
  log.info("probe_liveness", data);
  return NextResponse.json(data);
}
