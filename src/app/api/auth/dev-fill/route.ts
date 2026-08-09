import { NextResponse } from "next/server";
import { DEV_PLAIN_PASSWORD } from "@/lib/auth/credentials";
import { DEV_ROSTER } from "@/lib/mockDb/users";

/**
 * Non-production only: returns username + plaintext for quick-select autofill.
 * Disabled entirely in production builds.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const user = DEV_ROSTER.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    username: user.username,
    password: DEV_PLAIN_PASSWORD,
  });
}
