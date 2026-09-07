import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { id, logId } = await params;
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { createdById: true, delegatedById: true, status: true },
    });

    if (!activity) { console.log("Activity not found:", id); return NextResponse.json({ error: "Not found" }, { status: 404 }); }

    const isOwner = activity.createdById === session.id || activity.delegatedById === session.id;
    if (!isOwner && session.role !== "head") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (activity.status !== "pending") {
      return NextResponse.json({ error: "Activity is not active" }, { status: 400 });
    }

    const log = await prisma.dailyLog.findUnique({
      where: { id: logId, activityId: id }
    });

    if (!log || log.status !== "pending") {
      return NextResponse.json({ error: "Log not active" }, { status: 400 });
    }

    const now = new Date();
    let guestCode = log.guestCode;
    let expires = log.guestCodeExpiresAt;

    if (!guestCode || !expires || expires < now) {
      guestCode = generateCode();
      expires = new Date(now.getTime() + 1000 * 60 * 60 * 2); // 2 hours
      
      let retries = 3;
      while (retries > 0) {
        try {
          await prisma.dailyLog.update({
            where: { id: logId },
            data: { guestCode, guestCodeExpiresAt: expires }
          });
          break;
        } catch (e: any) {
          if (e.code === 'P2002') {
            guestCode = generateCode();
            retries--;
            if (retries === 0) throw new Error("Could not generate unique code");
          } else {
            throw e;
          }
        }
      }
    }

    return NextResponse.json({ guestCode, guestCodeExpiresAt: expires });
  } catch (err: any) {
    console.error("Guest session error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try {
    const { id, logId } = await params;
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = await prisma.dailyLog.findUnique({
      where: { id: logId, activityId: id },
      select: { guestCode: true, guestCodeExpiresAt: true }
    });

    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    if (log.guestCode && log.guestCodeExpiresAt && log.guestCodeExpiresAt > now) {
      return NextResponse.json({ guestCode: log.guestCode, guestCodeExpiresAt: log.guestCodeExpiresAt });
    }
    return NextResponse.json({ guestCode: null });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
