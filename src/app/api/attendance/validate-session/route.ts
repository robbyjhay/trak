import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import { parseJsonBody } from "@/lib/api/http";
import { readSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const session = await readSession();
    const body = await parseJsonBody<{ token?: string; code?: string }>(req);
    const token = (body.token || "").trim();
    const code = (body.code || "").trim();

    if (!token && !code) {
      return NextResponse.json({ error: "Token or code required" }, { status: 400 });
    }

    let logId: string | null = null;
    
    if (token) {
      const env = getEnv();
      const secret = env.TRAK_JWT_SECRET || env.TRAK_SESSION_SECRET;
      try {
        const result = await jwtVerify(token, new TextEncoder().encode(secret));
        logId = result.payload.logId as string;
      } catch (e) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
      }
    } else if (code) {
      const log = await prisma.dailyLog.findUnique({
        where: { guestCode: code }
      });
      if (!log || !log.guestCodeExpiresAt || log.guestCodeExpiresAt < new Date()) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 403 });
      }
      logId = log.id;
    }

    if (!logId) {
      return NextResponse.json({ error: "Invalid check-in details" }, { status: 400 });
    }

    const log = await prisma.dailyLog.findUnique({
      where: { id: logId },
      include: { activity: true }
    });

    if (!log || log.status !== "pending" || log.activity.status !== "pending") {
      return NextResponse.json({ error: "Attendance window is closed" }, { status: 403 });
    }

    let alreadySubmitted = false;
    if (session) {
      const existing = await prisma.attendee.findFirst({
        where: { dailyLogId: logId, userId: session.id },
      });
      if (existing) {
        alreadySubmitted = true;
      }
    }

    return NextResponse.json({ ok: true, logId, alreadySubmitted });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
