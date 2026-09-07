import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import { handleServiceError, parseJsonBody } from "@/lib/api/http";

export async function POST(req: Request) {
  try {
    const session = await readSession();
    
    const body = await parseJsonBody<{ token?: string; code?: string; name?: string; phone?: string; email?: string }>(req);
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

    let finalName = "";
    let finalPhone = "";
    let finalEmail = "";

    if (session) {
      // Authenticated member: strictly pull from DB, ignore client payload
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        include: { profile: true }
      });
      if (!user || !user.profile) {
        return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
      }
      finalName = user.profile.name;
      finalPhone = user.profile.phone || "";
      finalEmail = user.email || "";
    } else {
      // External guest: use client payload
      finalName = body.name?.trim() || "";
      finalPhone = body.phone?.trim() || "";
      finalEmail = body.email?.trim() || "";
      
      if (!finalName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      if (!finalPhone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
      if (!finalEmail) return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    // Prevent duplicates
    if (session) {
      const existing = await prisma.attendee.findFirst({
        where: { dailyLogId: logId, userId: session.id },
      });
      if (existing) {
        return NextResponse.json({ error: "Attendance already recorded" }, { status: 409 });
      }
    } else {
      const existing = await prisma.attendee.findFirst({
        where: { dailyLogId: logId, name: finalName, userId: null },
      });
      if (existing) {
        return NextResponse.json({ error: "Attendance already recorded for this name" }, { status: 409 });
      }
    }

    await prisma.attendee.create({
      data: {
        dailyLogId: logId,
        userId: session?.id || null,
        name: finalName,
        phone: finalPhone,
        email: finalEmail,
        source: "guest",
        status: "pending",
        registeredAt: new Date(),
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}
