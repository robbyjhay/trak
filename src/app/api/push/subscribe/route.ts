import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: session.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId: session.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
