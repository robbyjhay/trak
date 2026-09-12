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

    // Upsert the subscription — keyed by endpoint (unique constraint).
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

    // Clean up any OTHER stale subscriptions for this user that share the
    // same endpoint (shouldn't happen with unique constraint, but defensive)
    // or subscriptions that belong to other users with this endpoint
    // (edge case from account reassignment).
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: subscription.endpoint,
        userId: { not: session.id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let endpoint: string | null = null;
    try {
      const body = await req.json();
      endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
    } catch {
      endpoint = null;
    }

    if (endpoint) {
      // Scoped to the authenticated user — clients cannot delete others' rows.
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.id },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: session.id },
      });
    }

    // Notification history is intentionally untouched.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete push subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
