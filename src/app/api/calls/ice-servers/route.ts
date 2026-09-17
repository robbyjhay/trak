import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { getTurnIceServers } from "@/lib/calls/iceServers";

/**
 * Authenticated endpoint that hands the browser short-lived STUN/TURN servers
 * generated server-side from the Cloudflare Realtime API. The TURN Token ID /
 * API token never leave the server — only the generated credential does.
 */
export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { iceServers } = await getTurnIceServers();
    return NextResponse.json({ iceServers });
  } catch (err) {
    console.error("[calls] ICE server generation failed", err);
    // Never leak TURN secrets. The browser falls back to STUN when the list
    // is empty or this request errors.
    return NextResponse.json(
      { iceServers: [], error: "ICE server generation failed" },
      { status: 500 },
    );
  }
}