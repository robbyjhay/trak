import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID key not configured" }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}
