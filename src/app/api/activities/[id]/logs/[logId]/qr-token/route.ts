import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SignJWT } from "jose";
import { getEnv } from "@/lib/env";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { id, logId } = await params;
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { createdById: true, delegatedById: true, status: true },
    });

    if (!activity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = activity.createdById === session.id || activity.delegatedById === session.id;
    if (!isOwner && session.role !== "head") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (activity.status !== "pending") {
      return NextResponse.json({ error: "Activity is not active" }, { status: 400 });
    }

    const log = await prisma.dailyLog.findUnique({
      where: { id: logId, activityId: id },
      select: { id: true, status: true },
    });

    if (!log || log.status !== "pending") {
      return NextResponse.json({ error: "Log not active" }, { status: 400 });
    }

    const env = getEnv();
    const secret = env.TRAK_JWT_SECRET || env.TRAK_SESSION_SECRET;
    if (!secret) {
      throw new Error("Missing secret for JWT");
    }

    const expiresAt = Date.now() + 60000;
    const token = await new SignJWT({ logId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(new TextEncoder().encode(secret));

    return NextResponse.json({ token, expiresAt });
  } catch (err: any) {
    console.error("QR token error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
