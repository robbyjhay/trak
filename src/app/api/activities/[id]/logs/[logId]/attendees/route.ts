import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  try { console.log("Running attendees GET route, id:", params);
    const { id, logId } = await params;
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attendees = await prisma.attendee.findMany({
      where: { dailyLogId: logId, source: { in: ["link", "guest"] } },
      orderBy: { registeredAt: "desc" }
    });
    
    return NextResponse.json({ attendees });
  } catch (err) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
